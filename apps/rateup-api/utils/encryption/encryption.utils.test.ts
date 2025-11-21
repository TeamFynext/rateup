import { describe, expect, test } from "@jest/globals";
import crypto from "node:crypto";
import { aes_decrypt, aes_encrypt } from "./encryption.utils";

describe("Encryption Utils", () => {
  test("should encrypt and decrypt correctly", async () => {
    const dataToEncrypt = "Hello, World!";

    const key = crypto.randomBytes(32).toString("hex");

    const { encryptedData, iv } = aes_encrypt(
      dataToEncrypt,
      Buffer.from(key, "hex"),
    );
    const decryptedData = aes_decrypt(
      encryptedData,
      Buffer.from(key, "hex"),
      iv,
    );

    expect(decryptedData).toBe(dataToEncrypt);
  });
});
