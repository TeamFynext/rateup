import crypto from "node:crypto";
import { apiBaseUrl } from "../../loyalty/feedback/feedback.redirect.js";

export type UnsubscribeChannel = "email" | "whatsapp";

// Same secret as flow tokens and review links, under its own prefix so no token can be
// replayed as another kind.
const DOMAIN_PREFIX = "cu:";
export const UNSUBSCRIBE_PATH = "/api/public/customer-comms/unsubscribe";

function secret() {
  const value = process.env.FLOW_TOKEN_SECRET;
  if (!value) throw new Error("FLOW_TOKEN_SECRET environment variable must be set");
  return value;
}

function sign(payload: string) {
  return crypto
    .createHmac("sha256", secret())
    .update(`${DOMAIN_PREFIX}${payload}`)
    .digest("base64url");
}

/** `<base64url(userId:channel)>.<sig>`. No expiry: an old email's link must keep working. */
export function signUnsubscribeToken(userId: string, channel: UnsubscribeChannel): string {
  const payload = `${userId}:${channel}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifyUnsubscribeToken(
  token: string,
): { userId: string; channel: UnsubscribeChannel } | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = sign(payload);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const [userId, channel] = payload.split(":");
  if (!userId || (channel !== "email" && channel !== "whatsapp")) return null;
  return { userId, channel };
}

export function unsubscribeUrl(userId: string, channel: UnsubscribeChannel = "email"): string {
  return `${apiBaseUrl()}${UNSUBSCRIBE_PATH}/${signUnsubscribeToken(userId, channel)}`;
}

/**
 * RFC 8058 one-click headers. Gmail and Yahoo require both on bulk mail; the POST they send
 * carries `List-Unsubscribe=One-Click` and lands on the same URL as the footer link.
 */
export function listUnsubscribeHeaders(userId: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(userId)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
