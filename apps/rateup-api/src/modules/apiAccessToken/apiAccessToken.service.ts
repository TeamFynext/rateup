import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";

import prisma from "../../utils/prisma.js";
import redis from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";

/**
 * Partner API keys.
 *
 * Each key opens one API version. A v2 key is `rk_live_` or `rk_test_` followed by 32 random
 * bytes in base64url; the prefix is what lets a secret scanner recognise a leaked key, and
 * what tells a test key from a live one at a glance. A v1 key keeps the old shape (the 32
 * bytes alone, always live), so a v1 integration that rotates its key gets one it can use. Only the SHA-256 of the whole key is stored: the key is 256 bits of
 * randomness, so there is nothing for a slow hash to protect against, and bcrypt was costing
 * a libuv thread on every partner request.
 *
 * Keys minted before this were bcrypt-hashed and carry no prefix. Each is re-hashed the
 * first time it is used (`migrateLegacyKey`); once no row has a bcrypt hash left, that path
 * and the `accessToken` column can go.
 */

export type ApiKeyMode = "live" | "test";
export type ApiKeyVersion = "v1" | "v2";

const KEY_PREFIX: Record<ApiKeyMode, string> = { live: "rk_live_", test: "rk_test_" };

/** An org's ceiling. One per integration is the intent; this only stops runaway minting. */
export const MAX_KEYS_PER_ORG = 20;

/** How long a rotated-out key keeps working, so a deploy can pick the new one up. */
export const ROTATION_GRACE_HOURS = 24;

/** What a verified key grants. Cached by key hash, so it holds nothing secret. */
export interface ApiKeyGrant {
  keyId: string;
  orgId: string;
  scopes: string[];
  mode: ApiKeyMode;
  version: ApiKeyVersion;
  expiresAt: string | null;
}

/** The fields the console may see. Never the hash. */
const publicKeySelect = {
  id: true,
  name: true,
  displayPrefix: true,
  mode: true,
  version: true,
  scopes: true,
  createdAt: true,
  lastUsedAt: true,
  expiresAt: true,
  rotatedAt: true,
} as const;

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function mintApiKey(mode: ApiKeyMode = "live", version: ApiKeyVersion = "v2") {
  const secret = randomBytes(32).toString("base64url");
  if (version === "v1") {
    return { key: secret, tokenHash: hashApiKey(secret), displayPrefix: `${secret.slice(0, 4)}…` };
  }
  const key = KEY_PREFIX[mode] + secret;
  return {
    key,
    tokenHash: hashApiKey(key),
    displayPrefix: key.slice(0, KEY_PREFIX[mode].length + 4),
  };
}

/**
 * A bcrypt-hashed key. Still what the Zapier/automation, GetLead and Meta-connector keys use,
 * since each of those is verified by bcrypt where it is checked. Partner API keys use
 * `mintApiKey`.
 */
export async function generateApiKey() {
  const randomKey = randomBytes(32).toString("base64url");
  const hash = await bcrypt.hash(randomKey, 5);
  return { key: randomKey, hash };
}

// ---- the grant cache ---------------------------------------------------------

const GRANT_TTL_SECONDS = 60;

export const grantCacheKey = (tokenHash: string) => `apikey:${tokenHash}`;

function parseGrant(raw: string | null | undefined): ApiKeyGrant | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiKeyGrant;
  } catch {
    return null;
  }
}

async function cacheGrant(tokenHash: string, grant: ApiKeyGrant) {
  try {
    await redis.set(grantCacheKey(tokenHash), JSON.stringify(grant), "EX", GRANT_TTL_SECONDS);
  } catch (err) {
    log.warn({ err }, "API key cache write failed");
  }
}

/** Call after any change to a key, so the next request sees it rather than a minute later. */
async function forgetGrants(tokenHashes: (string | null)[]) {
  const keys = tokenHashes.filter((h): h is string => Boolean(h)).map(grantCacheKey);
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    // The entry still expires within GRANT_TTL_SECONDS. Logged loudly because a revoked key
    // working for that long is worth knowing about.
    log.error({ err }, "API key cache bust failed; a changed key may be honoured for a minute");
  }
}

// ---- verification ------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toGrant(row: {
  id: string;
  orgId: string;
  scopes: string[];
  mode: string;
  version: string;
  expiresAt: Date | null;
}): ApiKeyGrant {
  return {
    keyId: row.id,
    orgId: row.orgId,
    scopes: row.scopes,
    mode: row.mode === "test" ? "test" : "live",
    version: row.version === "v2" ? "v2" : "v1",
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

const grantSelect = {
  id: true,
  orgId: true,
  scopes: true,
  mode: true,
  version: true,
  expiresAt: true,
} as const;

/**
 * A pre-SHA-256 key: no prefix, bcrypt-hashed, and found only through the org it belongs
 * to. On a match it is re-hashed in place, so this runs at most once per legacy key.
 */
async function migrateLegacyKey(
  orgId: string,
  accessToken: string,
  tokenHash: string,
): Promise<ApiKeyGrant | null> {
  if (accessToken.startsWith("rk_") || !UUID.test(orgId)) return null;
  const legacy = await prisma.apiAccessToken.findMany({
    where: { orgId, tokenHash: null, accessToken: { not: null } },
    select: { ...grantSelect, accessToken: true },
  });
  for (const row of legacy) {
    if (!row.accessToken || !(await bcrypt.compare(accessToken, row.accessToken))) continue;
    // Conditional, so two first requests racing each other both succeed and write once.
    await prisma.apiAccessToken.updateMany({
      where: { id: row.id, tokenHash: null },
      data: { tokenHash, accessToken: null, displayPrefix: `${accessToken.slice(0, 4)}…` },
    });
    log.info({ orgId, keyId: row.id }, "Re-hashed a legacy API key with SHA-256");
    return toGrant(row);
  }
  return null;
}

/** Writes `lastUsedAt` at most once per key per window on this process, off the request path. */
const LAST_USED_WINDOW_MS = 5 * 60 * 1000;
const lastTouched = new Map<string, number>();

function touchLastUsed(keyId: string) {
  const now = Date.now();
  if (now - (lastTouched.get(keyId) ?? 0) < LAST_USED_WINDOW_MS) return;
  lastTouched.set(keyId, now);
  prisma.apiAccessToken
    .update({ where: { id: keyId }, data: { lastUsedAt: new Date(now) } })
    .catch((err: unknown) => log.warn({ err, keyId }, "Could not record an API key's last use"));
}

/**
 * The key's grant when it is valid for `orgId`, null otherwise.
 *
 * Looked up by hash through a unique index, so there is no stored secret to compare in
 * constant time: the comparison is the index lookup, on a value the caller cannot steer.
 * `cached` lets the caller pass a cache read it batched with something else (the external
 * API reads the suspension flag in the same round trip); omit it to read the cache here.
 */
export async function authenticateApiAccessToken(
  /** The org the URL names (v1), or null when the key alone names it (v2). */
  orgId: string | null,
  accessToken: string,
  options: { tokenHash?: string; cached?: string | null } = {},
): Promise<ApiKeyGrant | null> {
  const tokenHash = options.tokenHash ?? hashApiKey(accessToken);

  let grant: ApiKeyGrant | null;
  if ("cached" in options) {
    grant = parseGrant(options.cached);
  } else {
    try {
      grant = parseGrant(await redis.get(grantCacheKey(tokenHash)));
    } catch (err) {
      log.warn({ err }, "API key cache read failed; reading the key from Postgres");
      grant = null;
    }
  }

  if (!grant) {
    const row = await prisma.apiAccessToken.findUnique({
      where: { tokenHash },
      select: grantSelect,
    });
    grant = row
      ? toGrant(row)
      : orgId
        ? await migrateLegacyKey(orgId, accessToken, tokenHash)
        : null;
    if (!grant) return null;
    await cacheGrant(tokenHash, grant);
  }

  // A key works only for its own org, whatever org the URL names.
  if (orgId !== null && grant.orgId !== orgId) return null;
  if (grant.expiresAt && Date.parse(grant.expiresAt) <= Date.now()) return null;

  touchLastUsed(grant.keyId);
  return grant;
}

export async function verifyApiAccessToken(orgId: string, accessToken: string) {
  return (await authenticateApiAccessToken(orgId, accessToken)) !== null;
}

// ---- managing keys -------------------------------------------------------------

export class ApiKeyLimitError extends Error {
  constructor() {
    super(`An organization can hold at most ${MAX_KEYS_PER_ORG} API keys`);
    this.name = "ApiKeyLimitError";
  }
}

export class ApiKeyNotRotatableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyNotRotatableError";
  }
}

export class ApiKeyNotFoundError extends Error {
  constructor() {
    super("No such API key");
    this.name = "ApiKeyNotFoundError";
  }
}

export interface CreateApiKeyInput {
  name?: string;
  scopes?: string[];
  mode?: ApiKeyMode;
  /** Defaults to v2; v1 is for integrations still on the old API. */
  version?: ApiKeyVersion;
  expiresAt?: Date | null;
  createdById?: string | null;
}

export async function listApiKeys(orgId: string) {
  return prisma.apiAccessToken.findMany({
    where: { orgId },
    select: publicKeySelect,
    orderBy: { createdAt: "desc" },
  });
}

/** Mints a key and returns the plaintext beside its public record. The plaintext is never stored. */
export async function createApiKeyForOrg(orgId: string, input: CreateApiKeyInput = {}) {
  const count = await prisma.apiAccessToken.count({ where: { orgId } });
  if (count >= MAX_KEYS_PER_ORG) throw new ApiKeyLimitError();

  const version = input.version ?? "v2";
  // v1 has no test keys: nothing on it knows how to refuse one.
  const mode = version === "v1" ? "live" : (input.mode ?? "live");
  const { key, tokenHash, displayPrefix } = mintApiKey(mode, version);
  const record = await prisma.apiAccessToken.create({
    data: {
      orgId,
      tokenHash,
      displayPrefix,
      mode,
      version,
      name: input.name?.trim() || "Default key",
      scopes: input.scopes ?? [],
      expiresAt: input.expiresAt ?? null,
      createdById: input.createdById ?? null,
    },
    select: publicKeySelect,
  });
  return { key, record };
}

async function findOwnKey(orgId: string, keyId: string) {
  if (!UUID.test(keyId)) throw new ApiKeyNotFoundError();
  const row = await prisma.apiAccessToken.findFirst({
    where: { id: keyId, orgId },
    select: { ...publicKeySelect, tokenHash: true },
  });
  if (!row) throw new ApiKeyNotFoundError();
  return row;
}

export async function updateApiKey(
  orgId: string,
  keyId: string,
  input: { name?: string; scopes?: string[]; expiresAt?: Date | null },
) {
  const existing = await findOwnKey(orgId, keyId);
  const record = await prisma.apiAccessToken.update({
    where: { id: existing.id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() || existing.name } : {}),
      ...(input.scopes !== undefined ? { scopes: input.scopes } : {}),
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
    },
    select: publicKeySelect,
  });
  await forgetGrants([existing.tokenHash]);
  return record;
}

export async function revokeApiKey(orgId: string, keyId: string) {
  const existing = await findOwnKey(orgId, keyId);
  await prisma.apiAccessToken.delete({ where: { id: existing.id } });
  await forgetGrants([existing.tokenHash]);
}

/**
 * A new key with the old one's name, scopes and mode. The old key keeps working for
 * `graceHours` (0 ends it now) so an integration can be redeployed without an outage —
 * the old single-key regenerate killed it the instant the new one was shown.
 */
export async function rotateApiKey(
  orgId: string,
  keyId: string,
  {
    graceHours = ROTATION_GRACE_HOURS,
    createdById,
  }: { graceHours?: number; createdById?: string | null } = {},
) {
  const existing = await findOwnKey(orgId, keyId);
  // Rotating a key already rotated out, or one past its expiry, would mint a replacement
  // that inherits a grace-period end nobody chose. Rotate the key that replaced it instead.
  if (existing.rotatedAt) throw new ApiKeyNotRotatableError("This key was already replaced");
  if (existing.expiresAt && existing.expiresAt <= new Date()) {
    throw new ApiKeyNotRotatableError("This key has expired; create a new one instead");
  }
  const mode: ApiKeyMode = existing.mode === "test" ? "test" : "live";
  const version: ApiKeyVersion = existing.version === "v2" ? "v2" : "v1";
  const { key, tokenHash, displayPrefix } = mintApiKey(mode, version);
  const now = new Date();
  const graceEnds = new Date(now.getTime() + graceHours * 60 * 60 * 1000);
  const oldExpiry =
    existing.expiresAt && existing.expiresAt < graceEnds ? existing.expiresAt : graceEnds;

  const [record] = await prisma.$transaction([
    prisma.apiAccessToken.create({
      data: {
        orgId,
        tokenHash,
        displayPrefix,
        mode,
        version,
        name: existing.name,
        scopes: existing.scopes,
        expiresAt: existing.expiresAt,
        createdById: createdById ?? null,
      },
      select: publicKeySelect,
    }),
    prisma.apiAccessToken.update({
      where: { id: existing.id },
      data: { expiresAt: oldExpiry, rotatedAt: now },
    }),
  ]);
  await forgetGrants([existing.tokenHash]);
  return { key, record, previousKeyExpiresAt: oldExpiry };
}

/** Drops keys whose expiry has passed. Called from the scheduled sweep. */
export async function sweepExpiredApiKeys(): Promise<number> {
  const { count } = await prisma.apiAccessToken.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });
  return count;
}

// ---- the single-key API the console used before keys were plural ---------------
//
// Kept so a console that has not been redeployed keeps working. Each acts on the org's
// newest key, which is the only key such a console can have created.

/** Thrown when an org that already has a key asks for another through the legacy route. */
export class ApiKeyAlreadyExistsError extends Error {
  constructor() {
    super("This organization already has an API key");
    this.name = "ApiKeyAlreadyExistsError";
  }
}

async function newestKey(orgId: string) {
  return prisma.apiAccessToken.findFirst({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: { ...publicKeySelect, tokenHash: true },
  });
}

export async function createApiKey(orgId: string) {
  if (await newestKey(orgId)) throw new ApiKeyAlreadyExistsError();
  // The single-key console predates v2; what it mints is for the API it documents.
  return (await createApiKeyForOrg(orgId, { version: "v1" })).key;
}

/**
 * The legacy console's "delete key" button. Only the newest key: it is the only one that
 * console knows about, and wiping every key would cut off integrations it never saw.
 */
export async function deleteApiKey(orgId: string) {
  const current = await newestKey(orgId);
  if (!current) throw new ApiKeyNotFoundError();
  await revokeApiKey(orgId, current.id);
}

export async function getApiKeyCreatedAt(orgId: string) {
  return (await newestKey(orgId))?.createdAt;
}

export async function regenerateApiKey(orgId: string) {
  const current = await newestKey(orgId);
  if (!current) return (await createApiKeyForOrg(orgId, { version: "v1" })).key;
  return (await rotateApiKey(orgId, current.id)).key;
}

export async function getApiKeyScopes(orgId: string): Promise<string[] | null> {
  return (await newestKey(orgId))?.scopes ?? null;
}

export async function setApiKeyScopes(orgId: string, scopes: string[]) {
  const current = await newestKey(orgId);
  if (!current) throw new ApiKeyNotFoundError();
  return updateApiKey(orgId, current.id, { scopes });
}
