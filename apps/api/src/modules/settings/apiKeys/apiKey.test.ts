import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { createHash } from "node:crypto";

vi.mock("../../../generated/prisma/client.js", () => ({
  Role: { SUPER_ADMIN: "SUPER_ADMIN", ADMIN: "ADMIN", MEMBER: "MEMBER" },
}));

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    apiAccessToken: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../utils/redisConnection.js", () => ({
  default: { get: vi.fn(), set: vi.fn(), del: vi.fn(), mget: vi.fn() },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("./apiUsage.js", () => ({ getApiUsage: vi.fn(), listApiRequests: vi.fn() }));

import bcrypt from "bcrypt";
import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { generateRandomAlphaId } from "../../../utils/misc/random.utils.js";
import { buildActor } from "../../../authz/actor.js";
import {
  ApiKeyAlreadyExistsError,
  ApiKeyLimitError,
  ApiKeyNotFoundError,
  MAX_KEYS_PER_ORG,
  ROTATION_GRACE_HOURS,
  authenticateApiAccessToken,
  createApiKey,
  createApiKeyForOrg,
  deleteApiKey,
  generateApiKey,
  getApiKeyCreatedAt,
  getApiKeyScopes,
  grantCacheKey,
  hashApiKey,
  listApiKeys,
  mintApiKey,
  regenerateApiKey,
  revokeApiKey,
  rotateApiKey,
  setApiKeyScopes,
  updateApiKey,
  verifyApiAccessToken,
} from "./apiKey.service.js";
import {
  createApiAccessTokenHandler,
  createApiKeyHandler,
  deleteApiAccessTokenHandler,
  getApiAccessTokenCreatedAtHandler,
  getApiUsageHandler,
  listApiRequestsHandler,
  listApiKeysHandler,
  regenerateApiAccessTokenHandler,
  revokeApiKeyHandler,
  rotateApiKeyHandler,
  updateApiAccessTokenScopesHandler,
  updateApiKeyHandler,
} from "./apiKey.controller.js";
import { assertApiAccessToken, assertApiKeyV2, verifyWidgetTokenHook } from "./apiKey.auth.js";
import { getApiUsage } from "./apiUsage.js";
import { apiAccessTokenRoutes } from "./apiKey.route.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  apiAccessToken: Record<string, Mock>;
  $transaction: Mock;
};
const cache = redis as unknown as Record<"get" | "set" | "del" | "mget", Mock>;

const ORG = "11111111-1111-1111-1111-111111111111";
const OTHER_ORG = "22222222-2222-2222-2222-222222222222";
const CREATED = new Date("2026-01-01T00:00:00.000Z");
/** The old key shape v1 keeps: 32 random bytes in base64url, no prefix. */
const V1_KEY = /^[A-Za-z0-9_-]{43}$/;

/** Distinct key ids per row, so the in-process lastUsedAt debounce never leaks between tests. */
let seq = 0;
const keyId = () => `aaaaaaaa-aaaa-4aaa-8aaa-${String(++seq).padStart(12, "0")}`;

function row(over: Record<string, unknown> = {}) {
  return {
    id: keyId(),
    orgId: ORG,
    name: "Shopify POS",
    displayPrefix: "rk_live_AbCd",
    mode: "live",
    version: "v2",
    scopes: [] as string[],
    createdAt: CREATED,
    lastUsedAt: null,
    expiresAt: null as Date | null,
    tokenHash: "stored-hash",
    ...over,
  };
}

function grantJson(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    keyId: keyId(),
    orgId: ORG,
    scopes: [],
    mode: "live",
    version: "v2",
    expiresAt: null,
    ...over,
  });
}

/** Make Postgres hold exactly this key, looked up by its hash. */
function storeKey(key: string, over: Record<string, unknown> = {}) {
  const stored = row({ tokenHash: hashApiKey(key), ...over });
  db.apiAccessToken.findUnique.mockImplementation(async (args: any) =>
    args.where.tokenHash === stored.tokenHash ? stored : null,
  );
  return stored;
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function hookReq(over: Record<string, unknown> = {}) {
  return {
    params: {},
    query: {},
    headers: {},
    url: "/api/external/v1/x",
    ...over,
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.apiAccessToken.count.mockResolvedValue(0);
  db.apiAccessToken.create.mockImplementation(async (args: any) => row(args.data));
  db.apiAccessToken.delete.mockResolvedValue({});
  db.apiAccessToken.deleteMany.mockResolvedValue({ count: 0 });
  db.apiAccessToken.findFirst.mockResolvedValue(null);
  db.apiAccessToken.findMany.mockResolvedValue([]);
  db.apiAccessToken.findUnique.mockResolvedValue(null);
  db.apiAccessToken.update.mockImplementation(async (args: any) =>
    row({ id: args.where.id, ...args.data }),
  );
  db.apiAccessToken.updateMany.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  cache.get.mockResolvedValue(null);
  cache.set.mockResolvedValue("OK");
  cache.del.mockResolvedValue(1);
  cache.mget.mockResolvedValue([null, null]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ===========================================================================
// Minting
// ===========================================================================

describe("mintApiKey", () => {
  test("a live key carries the rk_live_ prefix and 32 random bytes", () => {
    const { key } = mintApiKey();

    expect(key).toMatch(/^rk_live_[A-Za-z0-9_-]{43}$/);
  });

  test("a test key carries the rk_test_ prefix", () => {
    expect(mintApiKey("test").key).toMatch(/^rk_test_[A-Za-z0-9_-]{43}$/);
  });

  test("the display prefix is the mode prefix plus four characters, never more", () => {
    const live = mintApiKey("live");
    const test_ = mintApiKey("test");

    expect(live.displayPrefix).toBe(live.key.slice(0, 12));
    expect(live.displayPrefix).toMatch(/^rk_live_.{4}$/);
    expect(test_.displayPrefix).toMatch(/^rk_test_.{4}$/);
  });

  test("the stored hash is the SHA-256 hex of the whole key", () => {
    const { key, tokenHash } = mintApiKey();

    expect(tokenHash).toBe(createHash("sha256").update(key).digest("hex"));
    expect(tokenHash).toBe(hashApiKey(key));
    expect(tokenHash).not.toContain(key);
  });

  test("the key does not come from Math.random", () => {
    const spy = vi.spyOn(Math, "random");

    mintApiKey();
    mintApiKey("test");

    expect(spy).not.toHaveBeenCalled();
  });

  test("two keys minted in a row differ", () => {
    expect(mintApiKey().key).not.toBe(mintApiKey().key);
  });

  test("v2 is the default; asking for it explicitly mints the same rk_ shape", () => {
    expect(mintApiKey("live", "v2").key).toMatch(/^rk_live_[A-Za-z0-9_-]{43}$/);
    expect(mintApiKey("test", "v2").key).toMatch(/^rk_test_[A-Za-z0-9_-]{43}$/);
  });

  test("a v1 key is the old shape: no prefix, 32 random bytes, whatever mode is asked", () => {
    for (const mode of ["live", "test"] as const) {
      const { key, tokenHash, displayPrefix } = mintApiKey(mode, "v1");

      expect(key).toMatch(V1_KEY);
      expect(key.startsWith("rk_")).toBe(false);
      expect(tokenHash).toBe(hashApiKey(key));
      expect(displayPrefix).toBe(`${key.slice(0, 4)}…`);
    }
  });
});

describe("generateApiKey (bcrypt, still used by the Zapier/GetLead/connector keys)", () => {
  test("does not use Math.random, nor does the shared alpha-id helper", async () => {
    const spy = vi.spyOn(Math, "random");

    await generateApiKey();
    const id = generateRandomAlphaId(128);

    expect(spy).not.toHaveBeenCalled();
    expect(id).toMatch(/^[A-Za-z]{128}$/);
  });

  test("returns the plaintext beside a five-round bcrypt hash of all of it", async () => {
    const { key, hash } = await generateApiKey();

    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash.split("$")[2]).toBe("05");
    expect(Buffer.byteLength(key)).toBeLessThanOrEqual(72);
    expect(await bcrypt.compare(key, hash)).toBe(true);
    const tampered = key.slice(0, -1) + (key.endsWith("A") ? "B" : "A");
    expect(await bcrypt.compare(tampered, hash)).toBe(false);
  });
});

// ===========================================================================
// Creating keys
// ===========================================================================

describe("createApiKeyForOrg", () => {
  test("stores the SHA-256 and display prefix, never the plaintext, and returns the plaintext", async () => {
    const { key } = await createApiKeyForOrg(ORG, { name: "POS" });

    const data = db.apiAccessToken.create.mock.calls[0][0].data;
    expect(data.orgId).toBe(ORG);
    expect(data.tokenHash).toBe(hashApiKey(key));
    expect(data.displayPrefix).toBe(key.slice(0, 12));
    expect(JSON.stringify(data)).not.toContain(key);
    expect(data).not.toHaveProperty("accessToken");
  });

  test("never selects the hash back out to the console", async () => {
    await createApiKeyForOrg(ORG);

    const select = db.apiAccessToken.create.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("tokenHash");
    expect(select).not.toHaveProperty("accessToken");
  });

  test("defaults: live, full access, the default name, no expiry", async () => {
    const { key } = await createApiKeyForOrg(ORG);

    expect(key.startsWith("rk_live_")).toBe(true);
    expect(db.apiAccessToken.create.mock.calls[0][0].data).toMatchObject({
      mode: "live",
      scopes: [],
      name: "Default key",
      expiresAt: null,
      createdById: null,
    });
  });

  test("a test key, its scopes, name, expiry and creator are kept", async () => {
    const expiresAt = new Date("2027-01-01T00:00:00Z");
    const { key } = await createApiKeyForOrg(ORG, {
      name: "  Sandbox  ",
      mode: "test",
      scopes: ["contacts.read"],
      expiresAt,
      createdById: "u-1",
    });

    expect(key.startsWith("rk_test_")).toBe(true);
    expect(db.apiAccessToken.create.mock.calls[0][0].data).toMatchObject({
      mode: "test",
      name: "Sandbox",
      scopes: ["contacts.read"],
      expiresAt,
      createdById: "u-1",
    });
  });

  test(`refuses the ${MAX_KEYS_PER_ORG + 1}th key without writing`, async () => {
    db.apiAccessToken.count.mockResolvedValueOnce(MAX_KEYS_PER_ORG);

    await expect(createApiKeyForOrg(ORG)).rejects.toBeInstanceOf(ApiKeyLimitError);
    expect(db.apiAccessToken.count).toHaveBeenCalledWith({ where: { orgId: ORG } });
    expect(db.apiAccessToken.create).not.toHaveBeenCalled();
  });

  test("one under the ceiling still mints", async () => {
    db.apiAccessToken.count.mockResolvedValueOnce(MAX_KEYS_PER_ORG - 1);

    await expect(createApiKeyForOrg(ORG)).resolves.toHaveProperty("key");
  });

  test("a key is v2 unless asked otherwise, and the record says so", async () => {
    const { record } = await createApiKeyForOrg(ORG);

    expect(db.apiAccessToken.create.mock.calls[0][0].data.version).toBe("v2");
    expect(db.apiAccessToken.create.mock.calls[0][0].select).toHaveProperty("version", true);
    expect(record.version).toBe("v2");
  });

  test("a v1 key is minted in the old shape and is always live, even when test is asked", async () => {
    const { key, record } = await createApiKeyForOrg(ORG, { version: "v1", mode: "test" });

    expect(key).toMatch(V1_KEY);
    const data = db.apiAccessToken.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ version: "v1", mode: "live", tokenHash: hashApiKey(key) });
    expect(data.displayPrefix).toBe(`${key.slice(0, 4)}…`);
    expect(record).toMatchObject({ version: "v1", mode: "live" });
  });

  test("a v2 test key stays a test key", async () => {
    const { key } = await createApiKeyForOrg(ORG, { version: "v2", mode: "test" });

    expect(key).toMatch(/^rk_test_/);
    expect(db.apiAccessToken.create.mock.calls[0][0].data).toMatchObject({
      version: "v2",
      mode: "test",
    });
  });
});

describe("listApiKeys", () => {
  test("lists only the org's keys, newest first, without hashes", async () => {
    await listApiKeys(ORG);

    const args = db.apiAccessToken.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ orgId: ORG });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.select).not.toHaveProperty("tokenHash");
    expect(args.select).not.toHaveProperty("accessToken");
  });
});

// ===========================================================================
// Verification
// ===========================================================================

describe("authenticateApiAccessToken", () => {
  test("looks the key up by its SHA-256 through the unique index", async () => {
    const { key } = mintApiKey();
    const stored = storeKey(key, { scopes: ["contacts.read"] });

    const grant = await authenticateApiAccessToken(ORG, key);

    expect(db.apiAccessToken.findUnique.mock.calls[0][0].where).toEqual({
      tokenHash: hashApiKey(key),
    });
    expect(grant).toEqual({
      keyId: stored.id,
      orgId: ORG,
      scopes: ["contacts.read"],
      mode: "live",
      version: "v2",
      expiresAt: null,
    });
  });

  test("the grant carries the key's version", async () => {
    const v1 = mintApiKey("live", "v1").key;
    storeKey(v1, { version: "v1" });
    await expect(authenticateApiAccessToken(ORG, v1)).resolves.toMatchObject({ version: "v1" });

    const v2 = mintApiKey().key;
    storeKey(v2, { version: "v2" });
    await expect(authenticateApiAccessToken(null, v2)).resolves.toMatchObject({
      version: "v2",
      orgId: ORG,
    });
  });

  test("a verified grant is cached by hash for 60s, holding nothing secret", async () => {
    const { key } = mintApiKey();
    storeKey(key);

    await authenticateApiAccessToken(ORG, key);

    const [cacheKey, value, ex, ttl] = cache.set.mock.calls[0];
    expect(cacheKey).toBe(`apikey:${hashApiKey(key)}`);
    expect(cacheKey).toBe(grantCacheKey(hashApiKey(key)));
    expect([ex, ttl]).toEqual(["EX", 60]);
    expect(value).not.toContain(key);
  });

  test("an unknown key is refused and nothing is cached", async () => {
    const { key } = mintApiKey();

    await expect(authenticateApiAccessToken(ORG, key)).resolves.toBeNull();
    expect(cache.set).not.toHaveBeenCalled();
  });

  test("a key for org A is refused for org B", async () => {
    const { key } = mintApiKey();
    storeKey(key, { orgId: ORG });

    await expect(authenticateApiAccessToken(OTHER_ORG, key)).resolves.toBeNull();
    await expect(verifyApiAccessToken(OTHER_ORG, key)).resolves.toBe(false);
  });

  test("a cached grant for org A is refused for org B too", async () => {
    const { key } = mintApiKey();

    await expect(
      authenticateApiAccessToken(OTHER_ORG, key, { cached: grantJson({ orgId: ORG }) }),
    ).resolves.toBeNull();
    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
  });

  test("an expired key is refused", async () => {
    const { key } = mintApiKey();
    storeKey(key, { expiresAt: new Date(Date.now() - 1000) });

    await expect(authenticateApiAccessToken(ORG, key)).resolves.toBeNull();
  });

  test("a key expiring this very millisecond is refused", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-16T12:00:00Z") });
    const { key } = mintApiKey();
    storeKey(key, { expiresAt: new Date("2026-10-16T12:00:00Z") });

    await expect(authenticateApiAccessToken(ORG, key)).resolves.toBeNull();
  });

  test("a key with a future expiry verifies", async () => {
    const { key } = mintApiKey();
    storeKey(key, { expiresAt: new Date(Date.now() + 60_000) });

    await expect(verifyApiAccessToken(ORG, key)).resolves.toBe(true);
  });

  test("an expired grant in the cache is refused without asking Postgres", async () => {
    const { key } = mintApiKey();

    await expect(
      authenticateApiAccessToken(ORG, key, {
        cached: grantJson({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
      }),
    ).resolves.toBeNull();
    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
  });

  test("a cached grant skips Postgres entirely", async () => {
    const { key } = mintApiKey();
    cache.get.mockResolvedValueOnce(grantJson({ scopes: ["loyalty.read"] }));

    const grant = await authenticateApiAccessToken(ORG, key);

    expect(grant?.scopes).toEqual(["loyalty.read"]);
    expect(cache.get).toHaveBeenCalledWith(grantCacheKey(hashApiKey(key)));
    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
    expect(db.apiAccessToken.findMany).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  test("a cache read the caller batched is used instead of a second Redis read", async () => {
    const { key } = mintApiKey();

    await authenticateApiAccessToken(ORG, key, { cached: grantJson() });

    expect(cache.get).not.toHaveBeenCalled();
    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
  });

  test("a batched miss (null) goes to Postgres without reading Redis again", async () => {
    const { key } = mintApiKey();
    storeKey(key);

    await expect(authenticateApiAccessToken(ORG, key, { cached: null })).resolves.not.toBeNull();
    expect(cache.get).not.toHaveBeenCalled();
    expect(db.apiAccessToken.findUnique).toHaveBeenCalledOnce();
  });

  test("a corrupt cache entry is treated as a miss", async () => {
    const { key } = mintApiKey();
    storeKey(key);
    cache.get.mockResolvedValueOnce("{not json");

    await expect(verifyApiAccessToken(ORG, key)).resolves.toBe(true);
    expect(db.apiAccessToken.findUnique).toHaveBeenCalledOnce();
  });

  test("Redis being down falls back to Postgres rather than refusing", async () => {
    const { key } = mintApiKey();
    storeKey(key);
    cache.get.mockRejectedValueOnce(new Error("redis down"));
    cache.set.mockRejectedValueOnce(new Error("redis down"));

    await expect(verifyApiAccessToken(ORG, key)).resolves.toBe(true);
  });

  test("a test key's grant says so", async () => {
    const { key } = mintApiKey("test");
    storeKey(key, { mode: "test" });

    await expect(authenticateApiAccessToken(ORG, key)).resolves.toMatchObject({ mode: "test" });
  });

  describe("lastUsedAt", () => {
    test("is written off the request path at most once per window per key", async () => {
      vi.useFakeTimers({ now: new Date("2026-10-16T12:00:00Z") });
      const { key } = mintApiKey();
      const stored = storeKey(key);

      await authenticateApiAccessToken(ORG, key);
      await authenticateApiAccessToken(ORG, key);
      expect(db.apiAccessToken.update).toHaveBeenCalledOnce();
      expect(db.apiAccessToken.update).toHaveBeenCalledWith({
        where: { id: stored.id },
        data: { lastUsedAt: new Date("2026-10-16T12:00:00Z") },
      });

      vi.setSystemTime(new Date("2026-10-16T12:06:00Z"));
      await authenticateApiAccessToken(ORG, key);
      expect(db.apiAccessToken.update).toHaveBeenCalledTimes(2);
    });

    test("a failed write never fails the request", async () => {
      const { key } = mintApiKey();
      storeKey(key);
      db.apiAccessToken.update.mockRejectedValueOnce(new Error("pg down"));

      await expect(verifyApiAccessToken(ORG, key)).resolves.toBe(true);
    });

    test("is not written for a refused key", async () => {
      const { key } = mintApiKey();
      storeKey(key, { orgId: OTHER_ORG });

      await authenticateApiAccessToken(ORG, key);

      expect(db.apiAccessToken.update).not.toHaveBeenCalled();
    });
  });

  describe("legacy bcrypt keys", () => {
    async function legacyRow(over: Record<string, unknown> = {}) {
      const { key, hash } = await generateApiKey();
      const stored = { ...row({ tokenHash: null }), accessToken: hash, ...over };
      return { key, stored };
    }

    test("verify once by bcrypt and are re-hashed with SHA-256 in place", async () => {
      const { key, stored } = await legacyRow();
      db.apiAccessToken.findMany.mockResolvedValueOnce([stored]);

      const grant = await authenticateApiAccessToken(ORG, key);

      expect(grant).toMatchObject({ keyId: stored.id, orgId: ORG });
      expect(db.apiAccessToken.findMany.mock.calls[0][0].where).toEqual({
        orgId: ORG,
        tokenHash: null,
        accessToken: { not: null },
      });
      expect(db.apiAccessToken.updateMany).toHaveBeenCalledWith({
        where: { id: stored.id, tokenHash: null },
        data: {
          tokenHash: hashApiKey(key),
          accessToken: null,
          displayPrefix: `${key.slice(0, 4)}…`,
        },
      });
      // …and the grant is cached under the new hash.
      expect(cache.set.mock.calls[0][0]).toBe(grantCacheKey(hashApiKey(key)));
    });

    test("a second use goes through the hash lookup and never bcrypt", async () => {
      const { key, stored } = await legacyRow();
      db.apiAccessToken.findMany.mockResolvedValueOnce([stored]);
      await authenticateApiAccessToken(ORG, key);

      // After the re-hash the row is found by its SHA-256.
      storeKey(key, { id: stored.id });
      const compare = vi.spyOn(bcrypt, "compare");
      db.apiAccessToken.findMany.mockClear();

      await expect(verifyApiAccessToken(ORG, key)).resolves.toBe(true);
      expect(compare).not.toHaveBeenCalled();
      expect(db.apiAccessToken.findMany).not.toHaveBeenCalled();
    });

    test("only the matching legacy row is migrated", async () => {
      const other = await legacyRow();
      const mine = await legacyRow();
      db.apiAccessToken.findMany.mockResolvedValueOnce([other.stored, mine.stored]);

      const grant = await authenticateApiAccessToken(ORG, mine.key);

      expect(grant?.keyId).toBe(mine.stored.id);
      expect(db.apiAccessToken.updateMany).toHaveBeenCalledOnce();
      expect(db.apiAccessToken.updateMany.mock.calls[0][0].where.id).toBe(mine.stored.id);
    });

    test("a wrong legacy key is refused and rewrites nothing", async () => {
      const { stored } = await legacyRow();
      db.apiAccessToken.findMany.mockResolvedValueOnce([stored]);

      await expect(verifyApiAccessToken(ORG, "not-the-key")).resolves.toBe(false);
      expect(db.apiAccessToken.updateMany).not.toHaveBeenCalled();
    });

    test("an rk_ token never takes the bcrypt path", async () => {
      const compare = vi.spyOn(bcrypt, "compare");
      const { key } = mintApiKey();

      await expect(verifyApiAccessToken(ORG, key)).resolves.toBe(false);
      expect(db.apiAccessToken.findMany).not.toHaveBeenCalled();
      expect(compare).not.toHaveBeenCalled();
    });

    test("a non-uuid org never reaches the legacy query", async () => {
      await expect(verifyApiAccessToken("not-a-uuid", "legacykey")).resolves.toBe(false);
      expect(db.apiAccessToken.findMany).not.toHaveBeenCalled();
    });

    test("losing the re-hash race to a concurrent first request still verifies", async () => {
      const { key, stored } = await legacyRow();
      db.apiAccessToken.findMany.mockResolvedValueOnce([stored]);
      db.apiAccessToken.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(verifyApiAccessToken(ORG, key)).resolves.toBe(true);
    });
  });
});

// ===========================================================================
// Managing keys
// ===========================================================================

describe("updateApiKey / revokeApiKey", () => {
  test("update is scoped to the org and busts the key's cached grant", async () => {
    const existing = row({ tokenHash: "h-1" });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

    await updateApiKey(ORG, existing.id, { scopes: ["contacts.read"] });

    expect(db.apiAccessToken.findFirst.mock.calls[0][0].where).toEqual({
      id: existing.id,
      orgId: ORG,
    });
    expect(db.apiAccessToken.update.mock.calls[0][0]).toMatchObject({
      where: { id: existing.id },
      data: { scopes: ["contacts.read"] },
    });
    expect(cache.del).toHaveBeenCalledWith(grantCacheKey("h-1"));
  });

  test("update only touches the fields it was given; a blank name keeps the old one", async () => {
    const existing = row({ name: "Old" });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

    await updateApiKey(ORG, existing.id, { name: "   " });

    expect(db.apiAccessToken.update.mock.calls[0][0].data).toEqual({ name: "Old" });
  });

  test("another org's key is not found and nothing is written", async () => {
    db.apiAccessToken.findFirst.mockResolvedValueOnce(null);

    await expect(updateApiKey(ORG, keyId(), { name: "x" })).rejects.toBeInstanceOf(
      ApiKeyNotFoundError,
    );
    expect(db.apiAccessToken.update).not.toHaveBeenCalled();
    expect(cache.del).not.toHaveBeenCalled();
  });

  test("a non-uuid key id is not found without a query", async () => {
    await expect(revokeApiKey(ORG, "nope")).rejects.toBeInstanceOf(ApiKeyNotFoundError);
    expect(db.apiAccessToken.findFirst).not.toHaveBeenCalled();
  });

  test("revoke deletes the row and busts the cache", async () => {
    const existing = row({ tokenHash: "h-2" });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

    await revokeApiKey(ORG, existing.id);

    expect(db.apiAccessToken.delete).toHaveBeenCalledWith({ where: { id: existing.id } });
    expect(cache.del).toHaveBeenCalledWith(grantCacheKey("h-2"));
  });

  test("a legacy key with no hash yet has nothing to bust", async () => {
    const existing = row({ tokenHash: null });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

    await revokeApiKey(ORG, existing.id);

    expect(cache.del).not.toHaveBeenCalled();
  });

  test("a failed bust is logged loudly, not thrown", async () => {
    const existing = row();
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);
    cache.del.mockRejectedValueOnce(new Error("redis down"));

    await expect(revokeApiKey(ORG, existing.id)).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalled();
  });
});

describe("rotateApiKey", () => {
  const NOW = new Date("2026-10-16T12:00:00.000Z");
  const hours = (h: number) => new Date(NOW.getTime() + h * 3600_000);

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  test("mints a new key with the same name, scopes, mode and version, in one transaction", async () => {
    const existing = row({
      mode: "test",
      scopes: ["loyalty.read"],
      name: "Till",
      tokenHash: "old",
    });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

    const { key } = await rotateApiKey(ORG, existing.id, { createdById: "u-9" });

    expect(key.startsWith("rk_test_")).toBe(true);
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.apiAccessToken.create.mock.calls[0][0].data).toMatchObject({
      orgId: ORG,
      tokenHash: hashApiKey(key),
      mode: "test",
      version: "v2",
      name: "Till",
      scopes: ["loyalty.read"],
      createdById: "u-9",
    });
  });

  test("rotating a v1 key mints a v1-format key, so the v1 integration can use it", async () => {
    const existing = row({ version: "v1", displayPrefix: "AbCd…", tokenHash: "old" });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

    const { key, record } = await rotateApiKey(ORG, existing.id);

    expect(key).toMatch(V1_KEY);
    const data = db.apiAccessToken.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ version: "v1", mode: "live", tokenHash: hashApiKey(key) });
    expect(data.displayPrefix).toBe(`${key.slice(0, 4)}…`);
    expect(record.version).toBe("v1");
  });

  test(`the old key keeps working for ${ROTATION_GRACE_HOURS}h by default`, async () => {
    const existing = row();
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

    const { previousKeyExpiresAt } = await rotateApiKey(ORG, existing.id);

    expect(previousKeyExpiresAt).toEqual(hours(ROTATION_GRACE_HOURS));
    expect(db.apiAccessToken.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: { expiresAt: hours(ROTATION_GRACE_HOURS), rotatedAt: NOW },
    });
  });

  test("a custom grace is honoured, and 0 ends the old key now", async () => {
    const a = row();
    db.apiAccessToken.findFirst.mockResolvedValueOnce(a);
    await expect(rotateApiKey(ORG, a.id, { graceHours: 2 })).resolves.toMatchObject({
      previousKeyExpiresAt: hours(2),
    });

    const b = row();
    db.apiAccessToken.findFirst.mockResolvedValueOnce(b);
    await expect(rotateApiKey(ORG, b.id, { graceHours: 0 })).resolves.toMatchObject({
      previousKeyExpiresAt: NOW,
    });
  });

  test("a key already rotated out cannot be rotated again", async () => {
    db.apiAccessToken.findFirst.mockResolvedValueOnce(
      row({ rotatedAt: new Date(), expiresAt: hours(20) }),
    );

    await expect(rotateApiKey(ORG, keyId())).rejects.toThrow("already replaced");
    expect(db.apiAccessToken.create).not.toHaveBeenCalled();
  });

  test("an expired key cannot be rotated", async () => {
    db.apiAccessToken.findFirst.mockResolvedValueOnce(row({ expiresAt: hours(-1) }));

    await expect(rotateApiKey(ORG, keyId())).rejects.toThrow("expired");
    expect(db.apiAccessToken.create).not.toHaveBeenCalled();
  });

  test("the old key is marked rotated", async () => {
    db.apiAccessToken.findFirst.mockResolvedValueOnce(row());

    await rotateApiKey(ORG, keyId());

    expect(db.apiAccessToken.update.mock.calls[0][0].data.rotatedAt).toBeInstanceOf(Date);
  });

  test("an earlier existing expiry is not extended by the grace", async () => {
    const existing = row({ expiresAt: hours(3) });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

    const { previousKeyExpiresAt } = await rotateApiKey(ORG, existing.id);

    expect(previousKeyExpiresAt).toEqual(hours(3));
    expect(db.apiAccessToken.update.mock.calls[0][0].data).toMatchObject({ expiresAt: hours(3) });
  });

  test("a later existing expiry is cut to the grace", async () => {
    const existing = row({ expiresAt: hours(24 * 30) });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

    const { previousKeyExpiresAt } = await rotateApiKey(ORG, existing.id);

    expect(previousKeyExpiresAt).toEqual(hours(ROTATION_GRACE_HOURS));
    // The new key keeps the owner's own expiry.
    expect(db.apiAccessToken.create.mock.calls[0][0].data.expiresAt).toEqual(hours(24 * 30));
  });

  test("busts the old key's cached grant so its new expiry applies now", async () => {
    const existing = row({ tokenHash: "old-hash" });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

    await rotateApiKey(ORG, existing.id);

    expect(cache.del).toHaveBeenCalledWith(grantCacheKey("old-hash"));
  });

  test("another org's key cannot be rotated", async () => {
    db.apiAccessToken.findFirst.mockResolvedValueOnce(null);

    await expect(rotateApiKey(ORG, keyId())).rejects.toBeInstanceOf(ApiKeyNotFoundError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// The legacy single-key functions act on the newest key
// ===========================================================================

describe("legacy single-key functions", () => {
  test("they all look up the org's newest key", async () => {
    await getApiKeyCreatedAt(ORG);

    expect(db.apiAccessToken.findFirst.mock.calls[0][0]).toMatchObject({
      where: { orgId: ORG },
      orderBy: { createdAt: "desc" },
    });
  });

  test("createApiKey mints a v1 key when the org has none: the console it serves predates v2", async () => {
    const key = await createApiKey(ORG);

    expect(key).toMatch(V1_KEY);
    expect(db.apiAccessToken.create).toHaveBeenCalledOnce();
    expect(db.apiAccessToken.create.mock.calls[0][0].data).toMatchObject({
      version: "v1",
      mode: "live",
    });
  });

  test("createApiKey refuses when the org already has a key", async () => {
    db.apiAccessToken.findFirst.mockResolvedValueOnce(row());

    await expect(createApiKey(ORG)).rejects.toBeInstanceOf(ApiKeyAlreadyExistsError);
    expect(db.apiAccessToken.create).not.toHaveBeenCalled();
  });

  test("created-at and scopes come from the newest key", async () => {
    const newest = row({ createdAt: CREATED, scopes: ["contacts.read"] });
    db.apiAccessToken.findFirst.mockResolvedValue(newest);

    await expect(getApiKeyCreatedAt(ORG)).resolves.toBe(CREATED);
    await expect(getApiKeyScopes(ORG)).resolves.toEqual(["contacts.read"]);
  });

  test("an org with no key reads back undefined / null", async () => {
    await expect(getApiKeyCreatedAt(ORG)).resolves.toBeUndefined();
    await expect(getApiKeyScopes(ORG)).resolves.toBeNull();
  });

  test("regenerate rotates the newest key, keeping it v1", async () => {
    const newest = row({ tokenHash: "newest", version: "v1", displayPrefix: "AbCd…" });
    db.apiAccessToken.findFirst.mockResolvedValue(newest);

    const key = await regenerateApiKey(ORG);

    expect(key).toMatch(V1_KEY);
    expect(db.apiAccessToken.create.mock.calls[0][0].data.version).toBe("v1");
    expect(db.apiAccessToken.update.mock.calls[0][0].where).toEqual({ id: newest.id });
    expect(cache.del).toHaveBeenCalledWith(grantCacheKey("newest"));
  });

  test("regenerate with no key mints a v1 one", async () => {
    const key = await regenerateApiKey(ORG);

    expect(key).toMatch(V1_KEY);
    expect(db.apiAccessToken.create.mock.calls[0][0].data.version).toBe("v1");
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.apiAccessToken.create).toHaveBeenCalledOnce();
  });

  test("setting scopes updates the newest key", async () => {
    const newest = row({ tokenHash: "newest" });
    db.apiAccessToken.findFirst.mockResolvedValue(newest);

    await setApiKeyScopes(ORG, ["loyalty.read"]);

    expect(db.apiAccessToken.update.mock.calls[0][0]).toMatchObject({
      where: { id: newest.id },
      data: { scopes: ["loyalty.read"] },
    });
  });

  test("setting scopes with no key is a not-found", async () => {
    await expect(setApiKeyScopes(ORG, [])).rejects.toBeInstanceOf(ApiKeyNotFoundError);
  });

  test("delete removes only the newest key, the one a legacy console knows about", async () => {
    const newest = row({ tokenHash: "newest-hash" });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(newest).mockResolvedValueOnce(newest);

    await deleteApiKey(ORG);

    expect(db.apiAccessToken.deleteMany).not.toHaveBeenCalled();
    expect(db.apiAccessToken.delete).toHaveBeenCalledWith({ where: { id: newest.id } });
    expect(cache.del).toHaveBeenCalledWith(grantCacheKey("newest-hash"));
  });
});

// ===========================================================================
// assertApiAccessToken and the support-webhook hook
// ===========================================================================

describe("assertApiAccessToken", () => {
  function authed(key: string, over: Record<string, unknown> = {}) {
    return hookReq({
      params: { orgId: ORG },
      headers: { authorization: `Bearer ${key}` },
      ...over,
    });
  }

  test("reads the grant and the suspension flag in one mget, with no org lookup", async () => {
    const { key } = mintApiKey();
    cache.mget.mockResolvedValueOnce([grantJson(), "0"]);

    await assertApiAccessToken(authed(key));

    expect(cache.mget).toHaveBeenCalledOnce();
    expect(cache.mget).toHaveBeenCalledWith(grantCacheKey(hashApiKey(key)), `org:suspended:${ORG}`);
    expect(cache.get).not.toHaveBeenCalled();
    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
  });

  test.each([
    ["1", true],
    ["0", false],
    [null, null],
  ])("suspension cache %s → suspended %s", async (flag, expected) => {
    const { key } = mintApiKey();
    cache.mget.mockResolvedValueOnce([grantJson(), flag]);

    await expect(assertApiAccessToken(authed(key))).resolves.toEqual({ suspended: expected });
  });

  test("stamps the key's identity on the request", async () => {
    const { key } = mintApiKey("test");
    const kid = keyId();
    cache.mget.mockResolvedValueOnce([
      grantJson({ keyId: kid, mode: "test", scopes: ["contacts.read", "not.a.permission"] }),
      null,
    ]);
    const request = authed(key);

    await assertApiAccessToken(request);

    expect(request.apiKey).toEqual({ id: kid, mode: "test", version: "v2" });
    expect(request.user).toEqual({ orgId: ORG, role: "SUPER_ADMIN" });
    expect(request.principal).toEqual({ kind: "apiKey", orgId: ORG, scopes: ["contacts.read"] });
    expect(request.actor.can("contacts.read")).toBe(true);
    expect(request.actor.can("contacts.manage")).toBe(false);
  });

  test("a cache miss verifies against Postgres", async () => {
    const { key } = mintApiKey();
    const stored = storeKey(key);
    const request = authed(key);

    await assertApiAccessToken(request);

    expect(request.apiKey?.id).toBe(stored.id);
    expect(db.apiAccessToken.findUnique).toHaveBeenCalledOnce();
  });

  test("Redis being down still verifies, and leaves suspension to the caller", async () => {
    const { key } = mintApiKey();
    storeKey(key);
    cache.mget.mockRejectedValueOnce(new Error("redis down"));

    await expect(assertApiAccessToken(authed(key))).resolves.toEqual({ suspended: null });
  });

  test("a key for another org is refused with 401", async () => {
    const { key } = mintApiKey();
    cache.mget.mockResolvedValueOnce([grantJson({ orgId: OTHER_ORG }), null]);
    const request = authed(key);

    await expect(assertApiAccessToken(request)).rejects.toMatchObject({
      status: 401,
      reason: "invalid_token",
    });
    expect(request.apiKey).toBeUndefined();
  });
});

describe("assertApiAccessToken with a version", () => {
  function authed(key: string) {
    return hookReq({ params: { orgId: ORG }, headers: { authorization: `Bearer ${key}` } });
  }

  test("v1 refuses a v2 key with 401, naming the API it works on", async () => {
    const { key } = mintApiKey();
    cache.mget.mockResolvedValueOnce([grantJson({ version: "v2" }), null]);
    const request = authed(key);

    const err = await assertApiAccessToken(request, { version: "v1" }).catch((e) => e);

    expect(err).toMatchObject({ status: 401, reason: "invalid_token" });
    expect(err.message).toContain("v2");
    expect(err.message).toContain("/api/external/v2");
    expect(request.apiKey).toBeUndefined();
    expect(request.user).toBeUndefined();
  });

  test("v2 refuses a v1 key with 401, naming v1", async () => {
    const key = mintApiKey("live", "v1").key;
    cache.mget.mockResolvedValueOnce([grantJson({ version: "v1" }), null]);
    const request = authed(key);

    const err = await assertApiAccessToken(request, { version: "v2" }).catch((e) => e);

    expect(err).toMatchObject({ status: 401, reason: "invalid_token" });
    expect(err.message).toContain("/api/external/v1/{orgId}");
    expect(request.apiKey).toBeUndefined();
  });

  test("a key of the asked version passes and is stamped with it", async () => {
    const key = mintApiKey("live", "v1").key;
    cache.mget.mockResolvedValueOnce([grantJson({ version: "v1" }), null]);
    const request = authed(key);

    await assertApiAccessToken(request, { version: "v1" });

    expect(request.apiKey).toMatchObject({ mode: "live", version: "v1" });
  });

  test("with no version asked, any of the org's keys passes (support webhook, widget)", async () => {
    for (const version of ["v1", "v2"]) {
      cache.mget.mockResolvedValueOnce([grantJson({ version }), null]);
      const request = authed(mintApiKey().key);

      await assertApiAccessToken(request);

      expect(request.apiKey?.version).toBe(version);
    }
  });
});

describe("assertApiKeyV2", () => {
  function bearer(token?: string) {
    return hookReq({
      url: "/api/external/v2/contacts",
      headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
    });
  }

  test("no Authorization header answers 401 without a lookup", async () => {
    const request = bearer();

    await expect(assertApiKeyV2(request)).rejects.toMatchObject({
      status: 401,
      reason: "no_token",
    });
    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });

  test("a token without the rk_ prefix is a v1 key: 401 pointing at v1, never looked up", async () => {
    const key = mintApiKey("live", "v1").key;
    storeKey(key, { version: "v1" });
    const compare = vi.spyOn(bcrypt, "compare");
    const request = bearer(key);

    const err = await assertApiKeyV2(request).catch((e) => e);

    expect(err).toMatchObject({ status: 401, reason: "invalid_token" });
    expect(err.message).toContain("v1");
    expect(db.apiAccessToken.findUnique).not.toHaveBeenCalled();
    expect(db.apiAccessToken.findMany).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  test("a valid rk_ key names the org: request.user.orgId comes from the grant", async () => {
    const { key } = mintApiKey();
    const stored = storeKey(key, { orgId: OTHER_ORG, scopes: ["contacts.read"] });
    const request = bearer(key);

    const grant = await assertApiKeyV2(request);

    expect(grant).toMatchObject({ keyId: stored.id, orgId: OTHER_ORG, version: "v2" });
    expect(request.user).toEqual({ orgId: OTHER_ORG, role: "SUPER_ADMIN" });
    expect(request.orgId).toBe(OTHER_ORG);
    expect(request.principal).toEqual({
      kind: "apiKey",
      orgId: OTHER_ORG,
      scopes: ["contacts.read"],
    });
    expect(request.apiKey).toEqual({ id: stored.id, mode: "live", version: "v2" });
  });

  test("never takes the bcrypt/legacy path: an unknown rk_ key is a plain 401", async () => {
    const { key } = mintApiKey();
    const compare = vi.spyOn(bcrypt, "compare");

    await expect(assertApiKeyV2(bearer(key))).rejects.toMatchObject({
      status: 401,
      reason: "invalid_token",
    });
    expect(db.apiAccessToken.findUnique).toHaveBeenCalledOnce();
    expect(db.apiAccessToken.findMany).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
  });

  test("a row stored as v1 is refused even when its token carries the rk_ prefix", async () => {
    const { key } = mintApiKey();
    storeKey(key, { version: "v1" });
    const request = bearer(key);

    const err = await assertApiKeyV2(request).catch((e) => e);

    expect(err).toMatchObject({ status: 401, reason: "invalid_token" });
    expect(err.message).toContain("/api/external/v1/{orgId}");
    expect(request.user).toBeUndefined();
    expect(request.apiKey).toBeUndefined();
  });
});

describe("assertApiKeyV2 → authenticateApiAccessToken", () => {
  test("is asked with a null org, so the key alone decides it", async () => {
    vi.resetModules();
    const authenticate = vi.fn(async () => ({
      keyId: keyId(),
      orgId: ORG,
      scopes: [],
      mode: "live",
      version: "v2",
      expiresAt: null,
    }));
    vi.doMock("./apiKey.service.js", async (importOriginal) => ({
      ...(await importOriginal<object>()),
      authenticateApiAccessToken: authenticate,
    }));
    try {
      const auth = await import("./apiKey.auth.js");
      const { key } = mintApiKey();
      const request = hookReq({ headers: { authorization: `Bearer ${key}` } });

      await auth.assertApiKeyV2(request);

      expect(authenticate).toHaveBeenCalledOnce();
      expect(authenticate.mock.calls[0]).toEqual([null, key]);
      expect(request.user.orgId).toBe(ORG);
    } finally {
      vi.doUnmock("./apiKey.service.js");
      vi.resetModules();
    }
  });
});

describe("verifyWidgetTokenHook", () => {
  async function runWidget(scopes: string[], version: "v1" | "v2" = "v2") {
    const { key } = mintApiKey("live", version);
    storeKey(key, { scopes, version });
    const request = hookReq({
      params: {},
      query: {},
      headers: { authorization: `Bearer ${key}` },
      url: "/api/support/contact",
    });
    const rep = reply();
    await verifyWidgetTokenHook(request, rep);
    return { request, rep };
  }

  test("a full-access rk_ key passes and names the org", async () => {
    const { request, rep } = await runWidget([]);

    expect(rep.code).not.toHaveBeenCalled();
    expect(request.user).toEqual({ orgId: ORG, role: "SUPER_ADMIN" });
  });

  test("an rk_ key with the widget feature passes", async () => {
    const { rep } = await runWidget(["widget.connect"]);

    expect(rep.code).not.toHaveBeenCalled();
  });

  test("a key with the widget feature among others passes", async () => {
    const { rep } = await runWidget(["contacts.read", "contacts.manage", "widget.connect"]);

    expect(rep.code).not.toHaveBeenCalled();
  });

  test("an older (non-rk_) key is refused 401, since it cannot name its org", async () => {
    const { request, rep } = await runWidget(["widget.connect"], "v1");

    expect(rep.code.mock.calls).toEqual([[401]]);
    expect(rep.send).toHaveBeenCalledWith({
      message: "Not authorized",
      error: expect.stringContaining("rk_"),
    });
    expect(request.user).toBeUndefined();
  });

  test("a key limited to other features is refused 403 with the reason", async () => {
    const { rep } = await runWidget(["contacts.read", "contacts.manage"]);

    expect(rep.code).toHaveBeenCalledWith(403);
    expect(rep.send).toHaveBeenCalledWith({
      message: "Forbidden",
      error: expect.stringContaining("Webchat widget feature"),
    });
  });

  test("a key whose stored scopes all left the catalogue is refused, not full access", async () => {
    const { rep } = await runWidget(["retired.permission"]);

    expect(rep.code).toHaveBeenCalledWith(403);
  });

  test("an unknown rk_ key answers 401 exactly once", async () => {
    const rep = reply();

    await verifyWidgetTokenHook(
      hookReq({ params: {}, query: {}, headers: { authorization: "Bearer rk_live_nope" } }),
      rep,
    );

    expect(rep.code.mock.calls).toEqual([[401]]);
  });

  test("no Authorization header answers 401", async () => {
    const rep = reply();

    await verifyWidgetTokenHook(hookReq({ params: {}, query: {}, headers: {} }), rep);

    expect(rep.code.mock.calls).toEqual([[401]]);
  });
});

// ===========================================================================
// The management handlers
// ===========================================================================

describe("controllers", () => {
  function req(over: Record<string, unknown> = {}) {
    return {
      user: { userId: "u-1", orgId: ORG, role: "MEMBER", email: "a@b.c" },
      actor: buildActor({ kind: "user", userId: "u-1", orgId: ORG, roleKey: "ADMIN" }),
      params: {},
      body: {},
      query: {},
      ...over,
    } as any;
  }

  test("list reads the session org's keys", async () => {
    const rep = reply();
    db.apiAccessToken.findMany.mockResolvedValueOnce([
      { id: "k", scopes: ["loyalty.read", "loyalty.cashier"] },
    ]);

    await listApiKeysHandler(req(), rep);

    expect(db.apiAccessToken.findMany.mock.calls[0][0].where).toEqual({ orgId: ORG });
    expect(rep.send).toHaveBeenCalledWith({
      keys: [{ id: "k", scopes: ["loyalty.read", "loyalty.cashier"], features: ["loyalty"] }],
    });
  });

  test("create answers 201 with the plaintext once, for the session org and user", async () => {
    const rep = reply();

    await createApiKeyHandler(
      req({ body: { name: "POS", features: ["contacts"], mode: "live" } }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(201);
    const body = rep.send.mock.calls[0][0];
    expect(body.apiKey).toMatch(/^rk_live_/);
    const data = db.apiAccessToken.create.mock.calls[0][0].data;
    expect(data.orgId).toBe(ORG);
    expect(data.createdById).toBe("u-1");
  });

  test("create passes the asked version through", async () => {
    const rep = reply();

    await createApiKeyHandler(
      req({ body: { name: "Legacy", features: ["contacts"], mode: "live", version: "v1" } }),
      rep,
    );

    expect(rep.send.mock.calls[0][0].apiKey).toMatch(V1_KEY);
    expect(rep.send.mock.calls[0][0].key.version).toBe("v1");
  });

  test("features are stored as the permissions they cover", async () => {
    await createApiKeyHandler(
      req({ body: { name: "Till", features: ["loyalty", "contacts"], mode: "live" } }),
      reply(),
    );

    expect(db.apiAccessToken.create.mock.calls[0][0].data.scopes).toEqual([
      "loyalty.read",
      "loyalty.cashier",
      "contacts.read",
      "contacts.manage",
    ]);
  });

  test("an update that names features replaces the scopes; one that does not keeps them", async () => {
    const existing = row({ scopes: ["teams.read"] });
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(existing);

    await updateApiKeyHandler(
      req({ params: { keyId: existing.id }, body: { features: ["surveys"] } }),
      reply(),
    );
    await updateApiKeyHandler(
      req({ params: { keyId: existing.id }, body: { name: "y" } }),
      reply(),
    );

    expect(db.apiAccessToken.update.mock.calls[0][0].data.scopes).toEqual(["surveys.read"]);
    expect(db.apiAccessToken.update.mock.calls[1][0].data).not.toHaveProperty("scopes");
  });

  test("an orgId smuggled into the body is ignored", async () => {
    await createApiKeyHandler(
      req({ body: { name: "x", features: ["contacts"], orgId: OTHER_ORG } }),
      reply(),
    );

    expect(db.apiAccessToken.create.mock.calls[0][0].data.orgId).toBe(ORG);
  });

  test("create at the ceiling answers 409", async () => {
    db.apiAccessToken.count.mockResolvedValueOnce(MAX_KEYS_PER_ORG);
    const rep = reply();

    await createApiKeyHandler(req({ body: { name: "x", features: ["contacts"] } }), rep);

    expect(rep.code).toHaveBeenCalledWith(409);
  });

  test("update / revoke / rotate are scoped to the session org and 404 another's key", async () => {
    const id = keyId();
    for (const [handler, extra] of [
      [updateApiKeyHandler, { body: { name: "x" } }],
      [revokeApiKeyHandler, {}],
      [rotateApiKeyHandler, { body: { graceHours: 24 } }],
    ] as const) {
      db.apiAccessToken.findFirst.mockResolvedValueOnce(null);
      const rep = reply();

      await (handler as any)(req({ params: { keyId: id }, ...extra }), rep);

      expect(db.apiAccessToken.findFirst.mock.lastCall![0].where).toEqual({ id, orgId: ORG });
      expect(rep.code).toHaveBeenCalledWith(404);
    }
  });

  test("revoke answers 204", async () => {
    const existing = row();
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);
    const rep = reply();

    await revokeApiKeyHandler(req({ params: { keyId: existing.id } }), rep);

    expect(rep.code).toHaveBeenCalledWith(204);
  });

  test("rotate answers with the new plaintext and the old key's end", async () => {
    const existing = row();
    db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);
    const rep = reply();

    await rotateApiKeyHandler(
      req({ params: { keyId: existing.id }, body: { graceHours: 1 } }),
      rep,
    );

    const body = rep.send.mock.calls[0][0];
    expect(body.apiKey).toMatch(/^rk_live_/);
    expect(body.previousKeyExpiresAt).toBeInstanceOf(Date);
    expect(db.apiAccessToken.create.mock.calls[0][0].data.createdById).toBe("u-1");
  });

  test("an unexpected failure escapes the handler rather than answering", async () => {
    db.apiAccessToken.count.mockRejectedValueOnce(new Error("connection lost"));
    const rep = reply();

    await expect(
      createApiKeyHandler(req({ body: { features: ["contacts"] } }), rep),
    ).rejects.toThrow("connection lost");
    expect(rep.send).not.toHaveBeenCalled();
  });

  test("usage is read for the session org", async () => {
    (getApiUsage as unknown as Mock).mockResolvedValueOnce({ days: [] });
    const rep = reply();

    await getApiUsageHandler(req({ query: { days: 7 } }), rep);

    expect(getApiUsage).toHaveBeenCalledWith(ORG, { days: 7 });
    expect(rep.send).toHaveBeenCalledWith({ days: [] });
  });

  describe("a key is a grant", () => {
    const limited = (over: { denies?: string[]; grants?: string[]; roleKey?: any } = {}) =>
      buildActor(
        { kind: "user", userId: "u-1", orgId: ORG, roleKey: over.roleKey ?? "ADMIN" },
        { denies: over.denies, grants: over.grants },
      );

    test("create refuses 403, naming them, permissions the member does not hold", async () => {
      const rep = reply();

      await createApiKeyHandler(
        req({
          actor: limited({ denies: ["campaigns.send"] }),
          body: { name: "x", features: ["campaigns"] },
        }),
        rep,
      );

      expect(rep.code).toHaveBeenCalledWith(403);
      expect(rep.send.mock.calls[0][0].message).toContain("campaigns.send");
      expect(db.apiAccessToken.create).not.toHaveBeenCalled();
    });

    test("a team-scoped member granted api_tokens.manage cannot mint an org-wide key", async () => {
      const rep = reply();

      await createApiKeyHandler(
        req({
          actor: limited({ roleKey: "MANAGER", grants: ["api_tokens.manage"] }),
          body: { name: "x", features: ["contacts"] },
        }),
        rep,
      );

      expect(rep.code).toHaveBeenCalledWith(403);
      expect(rep.send.mock.calls[0][0].reason).toBe("scope");
      expect(db.apiAccessToken.create).not.toHaveBeenCalled();
    });

    test("the widget feature needs no member permission: no role holds widget.connect", async () => {
      const rep = reply();

      await createApiKeyHandler(req({ body: { name: "Widget", features: ["widget"] } }), rep);

      expect(rep.code).toHaveBeenCalledWith(201);
    });

    test("an update cannot widen a limited key to full access", async () => {
      db.apiAccessToken.findFirst.mockResolvedValueOnce(row({ scopes: ["teams.read"] }));
      const rep = reply();

      await updateApiKeyHandler(req({ params: { keyId: keyId() }, body: { features: [] } }), rep);

      expect(rep.code).toHaveBeenCalledWith(400);
      expect(db.apiAccessToken.update).not.toHaveBeenCalled();
    });

    test("[] on a legacy full-access key leaves its scopes alone", async () => {
      const existing = row({ scopes: [] });
      db.apiAccessToken.findFirst.mockResolvedValueOnce(existing);

      await updateApiKeyHandler(
        req({ params: { keyId: existing.id }, body: { name: "renamed", features: [] } }),
        reply(),
      );

      expect(db.apiAccessToken.update.mock.calls[0][0].data).not.toHaveProperty("scopes");
    });

    test("rotating needs the old key's scopes, since the new key inherits them", async () => {
      db.apiAccessToken.findFirst.mockResolvedValueOnce(row({ scopes: ["campaigns.send"] }));
      const rep = reply();

      await rotateApiKeyHandler(
        req({
          actor: limited({ denies: ["campaigns.send"] }),
          params: { keyId: keyId() },
          body: { graceHours: 1 },
        }),
        rep,
      );

      expect(rep.code).toHaveBeenCalledWith(403);
      expect(db.apiAccessToken.create).not.toHaveBeenCalled();
    });

    test("the legacy console's create names every feature instead of storing []", async () => {
      await createApiAccessTokenHandler(req(), reply());

      const scopes = db.apiAccessToken.create.mock.calls[0][0].data.scopes;
      expect(scopes.length).toBeGreaterThan(0);
      expect(scopes).toContain("widget.connect");
    });
  });

  describe("legacy", () => {
    test("create answers 201 with a plaintext key for the session org", async () => {
      const rep = reply();

      await createApiAccessTokenHandler(req(), rep);

      expect(rep.code).toHaveBeenCalledWith(201);
      expect(rep.send.mock.calls[0][0].apiKey).toMatch(V1_KEY);
      expect(db.apiAccessToken.create.mock.calls[0][0].data).toMatchObject({
        orgId: ORG,
        version: "v1",
      });
    });

    test("a second create answers 409 and names the remedy", async () => {
      db.apiAccessToken.findFirst.mockResolvedValueOnce(row());
      const rep = reply();

      await createApiAccessTokenHandler(req(), rep);

      expect(rep.code).toHaveBeenCalledWith(409);
      expect(rep.send.mock.calls[0][0].error).toContain("regenerate");
    });

    test("delete answers 204 for the session org", async () => {
      const rep = reply();

      const newest = row();
      db.apiAccessToken.findFirst.mockResolvedValueOnce(newest).mockResolvedValueOnce(newest);

      await deleteApiAccessTokenHandler(req(), rep);

      expect(rep.code).toHaveBeenCalledWith(204);
      expect(db.apiAccessToken.delete).toHaveBeenCalledWith({ where: { id: newest.id } });
    });

    test("the created-at read reports the newest key", async () => {
      db.apiAccessToken.findFirst.mockResolvedValue(row({ scopes: ["contacts.read"] }));
      const rep = reply();

      await getApiAccessTokenCreatedAtHandler(req(), rep);

      expect(rep.send).toHaveBeenCalledWith({
        exists: true,
        createdAt: CREATED,
        scopes: ["contacts.read"],
      });
    });

    test("no key reads back an explicit absence", async () => {
      const rep = reply();

      await getApiAccessTokenCreatedAtHandler(req(), rep);

      expect(rep.send).toHaveBeenCalledWith({ exists: false, createdAt: null, scopes: [] });
    });

    test("scopes with no key answers 404", async () => {
      const rep = reply();

      await updateApiAccessTokenScopesHandler(req({ body: { scopes: ["contacts.read"] } }), rep);

      expect(rep.code).toHaveBeenCalledWith(404);
    });

    test("regenerate answers with a fresh plaintext key of the same version", async () => {
      db.apiAccessToken.findFirst.mockResolvedValue(row({ version: "v1" }));
      const rep = reply();

      await regenerateApiAccessTokenHandler(req(), rep);

      expect(rep.send.mock.calls[0][0].apiKey).toMatch(V1_KEY);
    });
  });
});

// ===========================================================================
// Route registration
// ===========================================================================

describe("routes", () => {
  function fakeServer() {
    const routes: any[] = [];
    const hooks: any[] = [];
    const add = (method: string) =>
      vi.fn((url, opts, handler) => routes.push({ method, url, opts, handler }));
    const srv: any = {
      addHook: vi.fn((name, fn) => hooks.push({ name, fn })),
      get: add("GET"),
      post: add("POST"),
      put: add("PUT"),
      patch: add("PATCH"),
      delete: add("DELETE"),
    };
    return { srv, routes, hooks };
  }

  const id = (r: any) => `${r.method} ${r.url}`;

  test("every route sits behind a single session declaration", async () => {
    const { srv, hooks } = fakeServer();

    await apiAccessTokenRoutes(srv);

    expect(hooks).toEqual([{ name: "onRoute", fn: expect.any(Function) }]);
    const probe: any = { method: "GET", url: "/x", config: {} };
    hooks[0].fn(probe);
    expect(probe.config).toEqual({ access: "session" });
  });

  test("registers the keys routes, usage, and the legacy single-key routes", async () => {
    const { srv, routes } = fakeServer();

    await apiAccessTokenRoutes(srv);

    expect(routes.map(id).sort()).toEqual(
      [
        "GET /keys",
        "POST /keys",
        "PATCH /keys/:keyId",
        "DELETE /keys/:keyId",
        "POST /keys/:keyId/rotate",
        "GET /usage",
        "GET /usage/requests",
        "POST /",
        "DELETE /",
        "POST /regenerate",
        "PUT /scopes",
        "GET /",
      ].sort(),
    );
  });

  test("every write requires api_tokens.manage and every read only api_tokens.read", async () => {
    const { srv, routes } = fakeServer();

    await apiAccessTokenRoutes(srv);

    for (const r of routes) {
      expect(r.opts.config.permission, id(r)).toBe(
        r.method === "GET" ? "api_tokens.read" : "api_tokens.manage",
      );
    }
  });

  test("each route is wired to its handler", async () => {
    const { srv, routes } = fakeServer();

    await apiAccessTokenRoutes(srv);

    const handlers = Object.fromEntries(routes.map((r) => [id(r), r.handler]));
    expect(handlers).toEqual({
      "GET /keys": listApiKeysHandler,
      "POST /keys": createApiKeyHandler,
      "PATCH /keys/:keyId": updateApiKeyHandler,
      "DELETE /keys/:keyId": revokeApiKeyHandler,
      "POST /keys/:keyId/rotate": rotateApiKeyHandler,
      "GET /usage": getApiUsageHandler,
      "GET /usage/requests": listApiRequestsHandler,
      "POST /": createApiAccessTokenHandler,
      "DELETE /": deleteApiAccessTokenHandler,
      "POST /regenerate": regenerateApiAccessTokenHandler,
      "PUT /scopes": updateApiAccessTokenScopesHandler,
      "GET /": getApiAccessTokenCreatedAtHandler,
    });
  });

  test("key ids are validated as UUIDs and bodies against their schemas", async () => {
    const { srv, routes } = fakeServer();

    await apiAccessTokenRoutes(srv);

    for (const r of routes.filter((x) => x.url.includes(":keyId"))) {
      expect(r.opts.schema.params.safeParse({ keyId: "nope" }).success, id(r)).toBe(false);
    }
    const create = routes.find((r) => id(r) === "POST /keys");
    expect(create.opts.schema.body.safeParse({ name: "x", features: ["bogus"] }).success).toBe(
      false,
    );
    // A new key names what it may use; nothing is full access by default any more.
    expect(create.opts.schema.body.safeParse({ name: "x" }).success).toBe(false);
    expect(create.opts.schema.body.safeParse({ name: "x", features: [] }).success).toBe(false);
    const named = { name: "x", features: ["contacts"] };
    expect(create.opts.schema.body.parse(named)).toMatchObject({ mode: "live" });
    expect(create.opts.schema.body.parse(named).version).toBe("v2");
    expect(create.opts.schema.body.parse({ ...named, version: "v1" }).version).toBe("v1");
    const scopes = routes.find((r) => id(r) === "PUT /scopes");
    expect(scopes.opts.schema.body.safeParse({ scopes: [] }).success).toBe(false);
    expect(scopes.opts.schema.body.safeParse({ scopes: ["contacts.read"] }).success).toBe(true);
    expect(create.opts.schema.body.safeParse({ name: "x", version: "v3" }).success).toBe(false);
    const rotate = routes.find((r) => id(r) === "POST /keys/:keyId/rotate");
    expect(rotate.opts.schema.body.safeParse({ graceHours: 169 }).success).toBe(false);
    const patch = routes.find((r) => id(r) === "PATCH /keys/:keyId");
    expect(patch.opts.schema.body.safeParse({}).success).toBe(false);
  });
});
