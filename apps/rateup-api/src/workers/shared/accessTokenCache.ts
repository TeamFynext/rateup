import dbPool from "../../utils/db.js";
import { decryptAccessToken } from "./whatsapp/index.js";

/**
 * Decrypted WhatsApp access tokens for the campaign dispatcher, by phone id.
 *
 * The fan-out used to decrypt the token once and copy it into every job's data,
 * so a live credential sat in Redis once per recipient — for days, for a drip or
 * throttled campaign — and was frozen at whatever it was when the campaign
 * started. Jobs now carry only the phone id, and each worker process resolves
 * the token itself.
 *
 * Cached because the dispatcher runs at concurrency 250: a query and a decrypt
 * per message would add a round trip to the region-split database for nothing.
 * The TTL is short so a reconnected number's new token is picked up within a
 * minute instead of failing every remaining send with error 190.
 */
export const ACCESS_TOKEN_TTL_MS = 60_000;

/** Distinct numbers are few; this only bounds a pathological case. */
const MAX_ENTRIES = 1_000;

type Loader = (orgId: string, phoneId: string) => Promise<string | null>;

interface Entry {
  expiresAt: number;
  /** A promise, so 250 concurrent jobs for one number share a single lookup. */
  token: Promise<string | null>;
}

export function createAccessTokenCache(
  load: Loader,
  ttlMs = ACCESS_TOKEN_TTL_MS,
  now: () => number = Date.now,
) {
  const entries = new Map<string, Entry>();

  return {
    /** The number's token, or null when the org has no settings row for it. */
    get(orgId: string, phoneId: string): Promise<string | null> {
      const key = `${orgId}:${phoneId}`;
      const hit = entries.get(key);
      if (hit && hit.expiresAt > now()) return hit.token;

      if (entries.size >= MAX_ENTRIES) entries.clear();
      const token = load(orgId, phoneId);
      entries.set(key, { expiresAt: now() + ttlMs, token });
      // A failed lookup is not cached: the next job tries again.
      token.catch(() => {
        if (entries.get(key)?.token === token) entries.delete(key);
      });
      return token;
    },
    clear() {
      entries.clear();
    },
  };
}

/**
 * The row the participant query joins (`WhatsappSettings` by org and phone id;
 * `phoneId` is unique). Raw `pg`, like the rest of `workers/shared/`.
 */
async function loadAccessToken(orgId: string, phoneId: string): Promise<string | null> {
  const { rows } = await dbPool.query<{ accessToken: string; accessToken_iv: string | null }>(
    `SELECT "accessToken", "accessToken_iv" FROM "WhatsappSettings"
     WHERE "phoneId" = $1 AND "orgId" = $2
     LIMIT 1`,
    [phoneId, orgId],
  );
  const row = rows[0];
  if (!row?.accessToken || !row.accessToken_iv) return null;
  return await decryptAccessToken(row.accessToken, row.accessToken_iv);
}

const cache = createAccessTokenCache(loadAccessToken);

/** The decrypted access token for one of an org's WhatsApp numbers. */
export function resolveCampaignAccessToken(orgId: string, phoneId: string): Promise<string | null> {
  return cache.get(orgId, phoneId);
}
