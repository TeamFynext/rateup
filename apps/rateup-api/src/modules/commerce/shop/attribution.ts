import redis from "../../../utils/redisConnection.js";
import type { ShopAttribution } from "./shop.types.js";

/**
 * Click-to-WhatsApp ad attribution. Meta's free window after an ad click lasts 72 hours, and
 * the referral rides only on the first message, so it is kept in Redis for that long and
 * attached to any order the contact starts meanwhile.
 */
const WINDOW_SECONDS = 72 * 3600;
const key = (orgId: string, contactId: string) => `shop:ctwa:${orgId}:${contactId}`;

export async function rememberAdReferral(
  orgId: string,
  contactId: string,
  referral: { source_id?: string; headline?: string; source_url?: string; ctwa_clid?: string },
) {
  const value: ShopAttribution = {
    kind: "ctwa_ad",
    adId: referral.source_id,
    adTitle: referral.headline,
    sourceUrl: referral.source_url,
    ctwaClid: referral.ctwa_clid,
    freeWindowUntil: new Date(Date.now() + WINDOW_SECONDS * 1000).toISOString(),
  };
  await redis.set(key(orgId, contactId), JSON.stringify(value), "EX", WINDOW_SECONDS);
}

export async function adAttribution(
  orgId: string,
  contactId: string,
): Promise<ShopAttribution | null> {
  const raw = await redis.get(key(orgId, contactId));
  return raw ? (JSON.parse(raw) as ShopAttribution) : null;
}
