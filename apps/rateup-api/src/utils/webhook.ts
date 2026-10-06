import crypto from "node:crypto";
import prisma from "./prisma.js";

/**
 * The secret survey response webhooks are signed with (`X-Rateup-Signature`),
 * derived from the org and its owner. Kept as it is so receivers already
 * verifying it keep working; the org's own webhook has a random secret of its
 * own (`Webhook.secret`). Delivery is `deliverOutgoingWebhook`.
 */
export async function getWebhookSecret(orgId: string) {
  const org = await prisma.org.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  if (!org) {
    throw new Error(`Org not found for id ${orgId}`);
  }
  const derivedKey = await pbkdf2Async(orgId, org.ownerId);
  return derivedKey.toString("base64");
}

function pbkdf2Async(
  input: string,
  salt: string,
  iterations = 100000,
  keylen = 32,
  digest = "sha256",
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(input, salt, iterations, keylen, digest, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}
