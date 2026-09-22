import crypto from "crypto";
import { HttpResponseError, Session } from "@shopify/shopify-api";
import prisma from "../../../utils/prisma.js";
import connection from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import shopify from "./shopify.config.js";

/**
 * The offline session as persisted in `Integration.credential.session`. It
 * round-trips through JSON, so the dates come back as ISO strings.
 *
 * Shopify requires expiring offline tokens for every public app from
 * 2027-01-01: the access token lives 60 minutes and the refresh token 90 days,
 * and each refresh retires the previous pair. A session without
 * `refreshToken` is a legacy non-expiring token awaiting its one-time cycle.
 */
export interface StoredShopifySession {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  accessToken?: string;
  scope?: string;
  expires?: string;
  refreshToken?: string;
  refreshTokenExpires?: string;
}

/** The refresh token is gone (revoked, uninstalled, expired or already rotated); the merchant has to run OAuth again. */
export class ShopifyReauthRequiredError extends Error {
  constructor(shop: string) {
    super(`Shopify authorization for ${shop} is no longer valid; the merchant must reconnect`);
    this.name = "ShopifyReauthRequiredError";
  }
}

// Refresh this long before the access token lapses, so no request goes out with
// a token that expires mid-flight.
const ACCESS_TOKEN_MARGIN_MS = 5 * 60_000;
// A shop nobody touches for 90 days would lose its refresh token; the daily
// cron refreshes any whose refresh token is this close to expiring.
const REFRESH_TOKEN_MARGIN_MS = 14 * 24 * 60 * 60_000;
const LOCK_TTL_MS = 30_000;
const LOCK_WAIT_MS = 15_000;
const LOCK_POLL_MS = 250;
// After a failed legacy cycle, keep using the legacy token for this long before
// trying again, instead of retrying on every API call.
const CYCLE_BACKOFF_SECONDS = 60 * 60;

interface ShopifySessionHolder {
  id: string;
  credential: { session: StoredShopifySession };
}

export function toStoredSession(session: Session): StoredShopifySession {
  return {
    id: session.id,
    shop: session.shop,
    state: session.state,
    isOnline: session.isOnline,
    accessToken: session.accessToken,
    scope: session.scope,
    ...(session.expires && { expires: session.expires.toISOString() }),
    ...(session.refreshToken && { refreshToken: session.refreshToken }),
    ...(session.refreshTokenExpires && {
      refreshTokenExpires: session.refreshTokenExpires.toISOString(),
    }),
  };
}

function toSession(stored: StoredShopifySession): Session {
  return new Session({
    ...stored,
    expires: stored.expires ? new Date(stored.expires) : undefined,
    refreshTokenExpires: stored.refreshTokenExpires
      ? new Date(stored.refreshTokenExpires)
      : undefined,
  });
}

function isLegacy(stored: StoredShopifySession) {
  return !stored.refreshToken;
}

function isAccessTokenExpired(stored: StoredShopifySession, marginMs = 0) {
  return !!stored.expires && new Date(stored.expires).getTime() - marginMs <= Date.now();
}

function needsRefresh(stored: StoredShopifySession) {
  if (isLegacy(stored)) return true;
  if (isAccessTokenExpired(stored, ACCESS_TOKEN_MARGIN_MS)) return true;
  return (
    !!stored.refreshTokenExpires &&
    new Date(stored.refreshTokenExpires).getTime() - REFRESH_TOKEN_MARGIN_MS <= Date.now()
  );
}

/**
 * Writes only `credential.session`, atomically, so a concurrent writer of the
 * rest of the credential (surveys, webhook flags) can't be lost and can't
 * resurrect a retired token pair.
 */
export async function saveShopifySession(integrationId: string, session: Session) {
  const stored = toStoredSession(session);
  await prisma.$executeRaw`UPDATE "Integration" SET credential = jsonb_set(credential, '{session}', ${JSON.stringify(stored)}::jsonb) WHERE id = ${integrationId}::uuid`;
  return stored;
}

async function readStoredSession(integrationId: string) {
  const row = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { credential: true },
  });
  return (row?.credential as { session?: StoredShopifySession } | undefined)?.session;
}

const cycleBackoffKey = (shop: string) => `shopify:token-cycle-failed:${shop}`;

/** A legacy token whose cycle failed recently: use it as is until the back-off lapses. */
async function isCycleBackedOff(stored: StoredShopifySession) {
  return isLegacy(stored) && (await connection.exists(cycleBackoffKey(stored.shop))) === 1;
}

const RELEASE_LOCK = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

/**
 * Exchanges the stored token under a per-shop lock. Shopify retires the old
 * pair on every refresh, so two workers refreshing the same shop at once would
 * leave one of them persisting a pair that is already dead.
 */
async function renewSession(integration: ShopifySessionHolder): Promise<StoredShopifySession> {
  if (!shopify) throw new Error("Shopify integration is not configured");
  const { shop } = integration.credential.session;
  const lockKey = `shopify:token-refresh:${shop}`;
  const lockToken = crypto.randomUUID();

  const acquired = await connection.set(lockKey, lockToken, "PX", LOCK_TTL_MS, "NX");
  if (!acquired) {
    // Another worker holds the lock; wait for it to persist the new pair.
    const deadline = Date.now() + LOCK_WAIT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
      const latest = await readStoredSession(integration.id);
      if (latest && (!needsRefresh(latest) || (await isCycleBackedOff(latest)))) return latest;
    }
    const latest = (await readStoredSession(integration.id)) ?? integration.credential.session;
    if (!isAccessTokenExpired(latest)) return latest;
    throw new Error(`Timed out waiting for the Shopify token refresh of ${shop}`);
  }

  try {
    // Re-read under the lock: whoever held it before us may already have renewed.
    const current = (await readStoredSession(integration.id)) ?? integration.credential.session;
    if (!needsRefresh(current)) return current;

    if (isLegacy(current)) {
      if (!current.accessToken) throw new ShopifyReauthRequiredError(shop);
      if (await isCycleBackedOff(current)) return current;
      try {
        // Irreversible: Shopify destroys the non-expiring token in the same
        // transaction, so the new pair is persisted before anything else.
        const { session } = await shopify.auth.migrateToExpiringToken({
          shop,
          nonExpiringOfflineAccessToken: current.accessToken,
        });
        log.info("Cycled the Shopify offline token of %s to an expiring one", shop);
        return await saveShopifySession(integration.id, session);
      } catch (e) {
        // Non-expiring tokens keep working until 2027-01-01, so a failed cycle
        // degrades to the legacy token rather than failing the caller.
        log.warn({ err: e, shop }, "Could not cycle the legacy Shopify token; using it as is");
        await connection.set(cycleBackoffKey(shop), "1", "EX", CYCLE_BACKOFF_SECONDS);
        return current;
      }
    }

    if (!current.refreshToken) throw new ShopifyReauthRequiredError(shop);
    try {
      const { session } = await shopify.auth.refreshToken({
        shop,
        refreshToken: current.refreshToken,
      });
      return await saveShopifySession(integration.id, session);
    } catch (e) {
      // Shopify answers every terminal case (revoked, uninstalled, expired,
      // already rotated) with the same 401; retrying can't help.
      if (e instanceof HttpResponseError && e.response.code === 401) {
        log.error({ shop }, "Shopify refresh token rejected; marking the integration inactive");
        await prisma.integration.update({ where: { id: integration.id }, data: { active: false } });
        throw new ShopifyReauthRequiredError(shop);
      }
      // Transient (network, 5xx, 429): the next call retries with the same
      // refresh token. The current access token may still have a few minutes.
      if (!isAccessTokenExpired(current)) {
        log.warn({ err: e, shop }, "Shopify token refresh failed; using the current token");
        return current;
      }
      throw e;
    }
  } finally {
    await connection.eval(RELEASE_LOCK, 1, lockKey, lockToken);
  }
}

/**
 * The session to build an Admin API client from. Renews the stored token when
 * it is about to expire (or is a legacy non-expiring one) and keeps the
 * caller's `integration` object pointing at the renewed session.
 */
export async function getActiveShopifySession(integration: ShopifySessionHolder): Promise<Session> {
  const stored = integration.credential?.session;
  if (!stored) throw new Error(`Shopify integration ${integration.id} has no session`);
  if (!needsRefresh(stored) || (await isCycleBackedOff(stored))) return toSession(stored);

  const renewed = await renewSession(integration);
  integration.credential.session = renewed;
  return toSession(renewed);
}

/** Daily: cycles legacy tokens ahead of the 2027-01-01 cutoff and keeps idle shops' refresh tokens alive. */
export async function renewShopifyTokensCronAction() {
  const integrations = (await prisma.integration.findMany({
    where: { name: IntegratedApps.shopify, active: true },
    select: { id: true, credential: true },
  })) as unknown as ShopifySessionHolder[];

  let renewed = 0;
  for (const integration of integrations) {
    const stored = integration.credential?.session;
    if (!stored || !needsRefresh(stored)) continue;
    try {
      await getActiveShopifySession(integration);
      renewed++;
    } catch (e) {
      log.error({ err: e, shop: stored.shop }, "Shopify token renewal failed");
    }
  }
  log.info("Renewed %d of %d Shopify tokens", renewed, integrations.length);
}

/**
 * `app/scopes_update`: under Shopify managed installation the merchant grants
 * scope changes in Shopify's UI rather than through our OAuth redirect, so the
 * stored scope is updated from the webhook.
 */
export async function updateShopifySessionScope(shop: string, scopes: string[]) {
  await prisma.$executeRaw`UPDATE "Integration" SET credential = jsonb_set(credential, '{session,scope}', to_jsonb(${scopes.join(",")}::text)) WHERE name = ${IntegratedApps.shopify} AND credential->'session'->>'shop' = ${shop}`;
}
