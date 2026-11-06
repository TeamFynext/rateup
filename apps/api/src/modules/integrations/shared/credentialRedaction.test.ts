import { describe, expect, test } from "vite-plus/test";

import {
  REDACTED_SECRET,
  redactCredentialSecrets,
  restoreRedactedSecrets,
} from "./credentialCrypto.js";

describe("credentials leaving the API", () => {
  test("every secret is replaced at any depth, everything else is kept", () => {
    const credential = {
      accessToken: "sk_live_1",
      keySecret: "rzp_secret",
      session: { shop: "demo.myshopify.com", refreshToken: "r1" },
      hooks: [{ url: "https://hooks.test/1", secret: "s1" }],
      baseUrl: "https://crm.test",
    };

    expect(redactCredentialSecrets(credential)).toEqual({
      accessToken: REDACTED_SECRET,
      keySecret: REDACTED_SECRET,
      session: { shop: "demo.myshopify.com", refreshToken: REDACTED_SECRET },
      hooks: [{ url: "https://hooks.test/1", secret: REDACTED_SECRET }],
      baseUrl: "https://crm.test",
    });
  });

  test("a settings save that echoes the placeholders keeps the stored secrets", () => {
    const stored = {
      accessToken: "tok",
      bigin: { pipeline: "old" },
      hooks: [{ secret: "s1" }],
    };
    const incoming = {
      accessToken: REDACTED_SECRET,
      bigin: { pipeline: "new" },
      hooks: [{ secret: REDACTED_SECRET }],
    };

    expect(restoreRedactedSecrets(incoming, stored)).toEqual({
      accessToken: "tok",
      bigin: { pipeline: "new" },
      hooks: [{ secret: "s1" }],
    });
  });

  test("a new secret value is saved, and a placeholder with nothing stored is dropped", () => {
    expect(
      restoreRedactedSecrets({ apiKey: "fresh", token: REDACTED_SECRET }, { apiKey: "old" }),
    ).toEqual({ apiKey: "fresh" });
  });
});
