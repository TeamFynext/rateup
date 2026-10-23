import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

import connection from "../../../utils/redisConnection.js";
import { getIntegrationKey } from "../shared/integrationSecret.js";

/**
 * Binds a Shopify install to the RateUp login that performed it.
 *
 * An install lands with no org (`connectShopify`); the merchant's RateUp session then
 * claims it. The claim used to need nothing but the shop domain, so any org could take
 * a shop that was installed but not yet linked. The OAuth callback — which only Shopify
 * can complete, for a merchant signed in to that shop's admin — now mints this token
 * and hands it to the frontend in the redirect; the claim must present it.
 *
 * `<body>.<sig>`: the body is `{ shop, exp, nonce }`, the signature an HMAC over it. The
 * nonce is also written to Redis for the token's lifetime and deleted on use, so a token
 * claims once.
 */

const CLAIM_TTL_MS = 15 * 60 * 1000;
const nonceKey = (nonce: string) => `shopify:claim:${nonce}`;

interface ClaimPayload {
  shop: string;
  exp: number;
  nonce: string;
}

/**
 * `INTEGRATION_SECRET_KEY`'s claim subkey. Where that key is not set yet (production
 * today), a subkey of the Shopify app secret instead: it is always present when Shopify
 * is configured, and HKDF keeps this use apart from Shopify's own HMACs.
 */
function claimKey(): Buffer {
  const key = getIntegrationKey("shopify-claim");
  if (key) return key;
  const appSecret = process.env.SHOPIFY_API_SECRET;
  if (!appSecret) throw new Error("No key to sign Shopify claim tokens with");
  return Buffer.from(hkdfSync("sha256", appSecret, Buffer.alloc(0), "rateup:shopify-claim", 32));
}

function sign(body: string) {
  return createHmac("sha256", claimKey()).update(body).digest("base64url");
}

export async function mintShopifyClaimToken(shop: string, now = Date.now()): Promise<string> {
  const payload: ClaimPayload = {
    shop,
    exp: now + CLAIM_TTL_MS,
    nonce: randomBytes(16).toString("hex"),
  };
  await connection.set(nonceKey(payload.nonce), shop, "PX", CLAIM_TTL_MS);
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** The token's payload when it is authentic, unexpired and for `shop`; null otherwise. */
export function verifyShopifyClaimToken(
  token: string,
  shop: string,
  now = Date.now(),
): ClaimPayload | null {
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let payload: ClaimPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString()) as ClaimPayload;
  } catch {
    return null;
  }
  if (payload.shop !== shop || typeof payload.exp !== "number" || payload.exp < now) return null;
  if (typeof payload.nonce !== "string" || !payload.nonce) return null;
  return payload;
}

/** Spends the token's nonce; true only for the first caller. */
export async function consumeShopifyClaimToken(payload: ClaimPayload): Promise<boolean> {
  return (await connection.del(nonceKey(payload.nonce))) === 1;
}
