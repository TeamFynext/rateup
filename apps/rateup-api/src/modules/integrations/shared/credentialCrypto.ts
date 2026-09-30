import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { log } from "../../../utils/logger.js";
import { getIntegrationKey } from "./integrationSecret.js";

/**
 * Field-level encryption for `Integration.credential`.
 *
 * Only the secret fields are encrypted — tokens, API keys, webhook secrets —
 * wherever they sit in the blob. Everything else stays readable JSON, because
 * rows are looked up by fields inside it (`session.shop`, `crmWebhook.channelId`,
 * `inbound.tokenHash`, `restaurantId`) and raw SQL rewrites parts of it; none of
 * that could work against one encrypted blob.
 *
 * Applied to every Prisma read and write of the `Integration` model by the
 * client extension in `utils/prisma.ts`, so call sites never see ciphertext.
 * Raw SQL bypasses that extension and must call {@link encryptCredentialSecrets}
 * itself.
 */

/**
 * Key names whose string values are secrets. Matched by name at any depth,
 * independent of provider, so an update that only knows the row id — not which
 * provider it is — encrypts the same fields a create would.
 */
const SECRET_KEYS = new Set([
  "access_token",
  "refresh_token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "api_key",
  "secret",
  "token",
  "client_secret",
  "clientSecret",
  "consumer_key",
  "consumerKey",
  "consumer_secret",
  "consumerSecret",
  "webhookSecret",
  "zohoWebhookSecret",
  "keySecret",
  "password",
]);

const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

let warnedNoKey = false;

export function isEncryptedSecret(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/**
 * AES-256-GCM, as `enc:v1:<base64 iv|tag|ciphertext>`.
 *
 * Without `INTEGRATION_SECRET_KEY` the value is stored as it is, with one
 * warning per process: a deploy that has not set the key yet keeps working,
 * and the backfill script encrypts once it is set.
 */
export function encryptSecret(plain: string): string {
  if (isEncryptedSecret(plain)) return plain;

  const key = getIntegrationKey("credential-encryption");
  if (!key) {
    if (!warnedNoKey) {
      warnedNoKey = true;
      log.warn("INTEGRATION_SECRET_KEY is not set; integration credentials are stored unencrypted");
    }
    return plain;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

/** Reverses {@link encryptSecret}; a plaintext value passes through untouched. */
export function decryptSecret(value: string): string {
  if (!isEncryptedSecret(value)) return value;

  const key = getIntegrationKey("credential-encryption");
  if (!key) {
    throw new Error("An integration credential is encrypted but INTEGRATION_SECRET_KEY is not set");
  }

  const packed = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = packed.subarray(0, IV_BYTES);
  const tag = packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(packed.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function transformSecrets(value: unknown, apply: (secret: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => transformSecrets(item, apply));
  // Anything that is not plain JSON — Prisma's JsonNull / DbNull sentinels, a
  // Date — is passed through as it is.
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] =
      SECRET_KEYS.has(key) && typeof child === "string" && child
        ? apply(child)
        : transformSecrets(child, apply);
  }
  return out;
}

/** A copy of `credential` with every secret field encrypted. */
export function encryptCredentialSecrets<T>(credential: T): T {
  return transformSecrets(credential, encryptSecret) as T;
}

/** A copy of `credential` with every secret field decrypted. */
export function decryptCredentialSecrets<T>(credential: T): T {
  return transformSecrets(credential, decryptSecret) as T;
}
