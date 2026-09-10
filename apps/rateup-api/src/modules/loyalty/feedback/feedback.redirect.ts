import crypto from "node:crypto";

/**
 * The "Review us on Google" button a happy customer receives points at RateUp, not at
 * Google, so that the tap can be recorded and the review reward granted before the
 * browser is forwarded on. The URL carries the request id and an HMAC over it, signed
 * with the same secret as flow tokens but under its own prefix so the two can never be
 * exchanged for one another.
 *
 * Nothing sensitive is in the URL — the request row holds everything — and there is no
 * expiry: what a tap may still do is decided from the row's own state (already clicked,
 * reward already held), which is also what makes a re-tap harmless.
 */

const DOMAIN_PREFIX = "lfr:";
export const REVIEW_REDIRECT_PATH = "/api/public/loyalty/feedback/review";

function secret() {
  const value = process.env.FLOW_TOKEN_SECRET;
  if (!value) {
    throw new Error("FLOW_TOKEN_SECRET environment variable must be set");
  }
  return value;
}

export function signReviewRedirect(requestId: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${DOMAIN_PREFIX}${requestId}`)
    .digest("base64url");
}

export function verifyReviewRedirect(requestId: string, sig: string): boolean {
  const expected = signReviewRedirect(requestId);
  // Both are base64url of a 32-byte digest; the length check keeps timingSafeEqual from
  // throwing on a malformed signature.
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * The API's public origin. Customers are redirected through it, so it has to be the
 * address a browser can reach — the same rule flow.controller.ts applies to the flow
 * endpoint URI it hands Meta.
 */
function apiBaseUrl(): string {
  const raw = (process.env.API_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw) {
    throw new Error("API_URL environment variable must be set to build review links");
  }
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function reviewRedirectPath(requestId: string): string {
  return `${REVIEW_REDIRECT_PATH}/${requestId}/${signReviewRedirect(requestId)}`;
}

export function buildReviewRedirectUrl(requestId: string): string {
  return `${apiBaseUrl()}${reviewRedirectPath(requestId)}`;
}
