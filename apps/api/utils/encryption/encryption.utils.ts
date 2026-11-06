import crypto from "node:crypto";

/**
 * WhatsApp/Meta access-token encryption at rest.
 *
 * New values are AES-256-GCM, so a tampered ciphertext fails to decrypt instead of
 * decrypting to garbage the way CBC without a MAC does. The ciphertext carries a version
 * prefix (`gcm1:<ciphertext hex>:<tag hex>`); the IV stays 16 bytes of hex in its own
 * column (or in front of an inline value), the shape every stored row already has.
 *
 * Values written before this change are bare CBC hex with no prefix, and `aes_decrypt`
 * still reads them, so existing rows keep working and need no migration; each is
 * re-encrypted as GCM the next time it is saved.
 */
const GCM_PREFIX = "gcm1:";
const IV_BYTES = 16;

export function aes_encrypt(dataToEncrypt: string, encryptionKey: crypto.CipherKey) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(dataToEncrypt, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encryptedData: `${GCM_PREFIX}${encrypted.toString("hex")}:${tag.toString("hex")}`,
    iv: iv.toString("hex"),
  };
}

export function aes_decrypt(
  encryptedData: string,
  encryptionKey: crypto.CipherKey,
  iv: string,
): string {
  if (encryptedData.startsWith(GCM_PREFIX)) {
    const [ciphertext, tag, ...rest] = encryptedData.slice(GCM_PREFIX.length).split(":");
    if (ciphertext === undefined || !tag || rest.length) {
      throw new Error("Malformed encrypted token");
    }
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "hex")),
      decipher.final(),
    ]).toString("utf8");
  }
  return legacyCbcDecrypt(encryptedData, encryptionKey, iv);
}

/** The pre-GCM format: AES-256-CBC, hex ciphertext, no integrity check. Read-only. */
function legacyCbcDecrypt(encryptedData: string, encryptionKey: crypto.CipherKey, iv: string) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, Buffer.from(iv, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
