import { describe, expect, test } from "vite-plus/test";
import crypto from "node:crypto";
import { aes_decrypt, aes_encrypt } from "./encryption.utils.js";

const key = crypto.randomBytes(32);

/** A value as rows written before the GCM change hold it. */
function legacyCbcEncrypt(value: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encryptedData = cipher.update(value, "utf8", "hex") + cipher.final("hex");
  return { encryptedData, iv: iv.toString("hex") };
}

describe("Encryption Utils", () => {
  test("should encrypt and decrypt correctly", () => {
    const { encryptedData, iv } = aes_encrypt("Hello, World!", key);

    expect(aes_decrypt(encryptedData, key, iv)).toBe("Hello, World!");
  });

  test("new values are versioned AES-256-GCM with a 16-byte hex IV", () => {
    const { encryptedData, iv } = aes_encrypt("EAAG-token", key);

    expect(encryptedData).toMatch(/^gcm1:[0-9a-f]+:[0-9a-f]{32}$/);
    // The inline form (`iv:data`) and the iv column both expect 32 hex characters.
    expect(iv).toMatch(/^[0-9a-f]{32}$/);
  });

  test("still decrypts a legacy AES-256-CBC value", () => {
    const { encryptedData, iv } = legacyCbcEncrypt("EAAG-legacy-token");

    expect(aes_decrypt(encryptedData, key, iv)).toBe("EAAG-legacy-token");
  });

  test("a tampered GCM ciphertext is refused, not decrypted to garbage", () => {
    const { encryptedData, iv } = aes_encrypt("EAAG-token", key);
    const [prefix, ciphertext, tag] = encryptedData.split(":");
    const flipped = (parseInt(ciphertext!.slice(0, 2), 16) ^ 1).toString(16).padStart(2, "0");
    const tampered = `${prefix}:${flipped}${ciphertext!.slice(2)}:${tag}`;

    expect(() => aes_decrypt(tampered, key, iv)).toThrow();
  });

  test("the wrong key is refused", () => {
    const { encryptedData, iv } = aes_encrypt("EAAG-token", key);

    expect(() => aes_decrypt(encryptedData, crypto.randomBytes(32), iv)).toThrow();
  });

  test("a malformed GCM value is refused", () => {
    expect(() => aes_decrypt("gcm1:abcd", key, "00".repeat(16))).toThrow("Malformed");
  });
});
