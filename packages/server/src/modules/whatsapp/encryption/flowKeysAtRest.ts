import { aes_decrypt, aes_encrypt } from "../../../utils/encryption/encryption.utils.js";

/**
 * `WhatsappSettings.encryption` at rest (WEBH-8).
 *
 * The column holds a number's WhatsApp Flow RSA key pair: the public key Meta encrypts flow
 * requests with, the passphrase-protected private key, and the passphrase. Stored as clear JSON,
 * anyone with a read of the table had a usable private key. New writes store an envelope instead:
 *
 *     { "v": 1, "iv": "<hex>", "enc": "gcm1:<ciphertext hex>:<tag hex>" }
 *
 * `enc` is the whole `{ publicKey, privateKey, passphrase }` JSON, AES-256-GCM encrypted with the
 * same `wa_access_token_encryption_key` and the same shared helpers as the access tokens.
 *
 * Rows written before this change still hold the plain object. `openFlowKeys` reads both, so no
 * data migration is needed; a legacy row is sealed the next time its keys are written (a key
 * rotation or reconnect).
 */

export const FLOW_KEYS_ENVELOPE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The stored, encrypted form. */
export function isSealedFlowKeys(value: unknown): value is SealedWaEncryptionKeys {
  return (
    isRecord(value) &&
    value.v === FLOW_KEYS_ENVELOPE_VERSION &&
    typeof value.iv === "string" &&
    typeof value.enc === "string"
  );
}

/** The plain `{ publicKey, privateKey, passphrase }` form (legacy rows, and every caller's input). */
export function isPlainFlowKeys(value: unknown): value is WaEncryptionKeys {
  return (
    isRecord(value) &&
    typeof value.publicKey === "string" &&
    typeof value.privateKey === "string" &&
    typeof value.passphrase === "string"
  );
}

function getKey(): Buffer {
  const key = process.env.wa_access_token_encryption_key;
  if (!key) {
    throw new Error("wa_access_token_encryption_key is not configured");
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a key pair for storage. An already-sealed value is returned as it is, so a caller
 * that copies a stored value back (an upsert, a clone) does not double-encrypt it.
 */
export function sealFlowKeys(
  keys: WaEncryptionKeys | SealedWaEncryptionKeys,
): SealedWaEncryptionKeys {
  if (isSealedFlowKeys(keys)) return keys;
  if (!isPlainFlowKeys(keys)) {
    throw new Error("encryption keys must include publicKey, privateKey, and passphrase together");
  }
  const { publicKey, privateKey, passphrase } = keys;
  const { encryptedData, iv } = aes_encrypt(
    JSON.stringify({ publicKey, privateKey, passphrase }),
    getKey(),
  );
  return { v: FLOW_KEYS_ENVELOPE_VERSION, iv, enc: encryptedData };
}

/**
 * Read a stored `encryption` value: the sealed envelope or a legacy plain object. Returns null
 * for an empty column. Throws when a sealed value does not decrypt (wrong key, tampered row) or
 * the column holds something that is neither form — a flow endpoint must fail loudly rather
 * than try to decrypt with garbage.
 */
export function openFlowKeys(stored: unknown): WaEncryptionKeys | null {
  if (stored === null || stored === undefined) return null;
  if (isSealedFlowKeys(stored)) {
    const opened: unknown = JSON.parse(aes_decrypt(stored.enc, getKey(), stored.iv));
    if (!isPlainFlowKeys(opened)) {
      throw new Error("Stored WhatsApp Flow keys decrypted to an unexpected shape");
    }
    return opened;
  }
  if (isPlainFlowKeys(stored)) return stored;
  throw new Error("Stored WhatsApp Flow keys are in an unrecognised format");
}
