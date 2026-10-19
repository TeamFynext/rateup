import crypto from "node:crypto";

/**
 * POST a notification to the app's webhook the way Meta does.
 *
 * Meta signs every delivery with `X-Hub-Signature-256: sha256=<hex>`, an
 * HMAC-SHA256 of the raw body keyed with the app secret, and the app refuses an
 * unsigned one. So the body is serialized once and that exact string is both
 * signed and sent — re-serializing between the two would not hash identically.
 *
 * Without a secret the delivery goes out unsigned, which only an app with
 * signature checks off (or in `log` mode) will process.
 */
export function postWebhook(target, payload, appSecret) {
  const body = JSON.stringify(payload);
  const headers = { "content-type": "application/json" };
  if (appSecret) {
    const digest = crypto.createHmac("sha256", appSecret).update(body).digest("hex");
    headers["x-hub-signature-256"] = `sha256=${digest}`;
  }
  return fetch(target, { method: "POST", headers, body });
}
