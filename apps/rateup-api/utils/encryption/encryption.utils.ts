import crypto from "node:crypto";

export function aes_encrypt(
  dataToEncrypt: string,
  encryptionKey: crypto.CipherKey,
) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);
  let encrypted = cipher.update(dataToEncrypt, "utf8", "hex");
  encrypted += cipher.final("hex");
  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
  };
}

export function aes_decrypt(
  encryptedData: string,
  encryptionKey: crypto.CipherKey,
  iv: string,
): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    encryptionKey,
    Buffer.from(iv, "hex"),
  );
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
