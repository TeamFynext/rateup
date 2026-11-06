import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

import {
  decryptCredentialSecrets,
  decryptSecret,
  encryptCredentialSecrets,
  encryptSecret,
  isEncryptedSecret,
} from "./credentialCrypto.js";
import { signOAuthState, verifyOAuthState } from "./oauth2.js";

const KEY = randomBytes(32).toString("base64");
let saved: string | undefined;

beforeEach(() => {
  saved = process.env.INTEGRATION_SECRET_KEY;
  process.env.INTEGRATION_SECRET_KEY = KEY;
});
afterEach(() => {
  if (saved === undefined) delete process.env.INTEGRATION_SECRET_KEY;
  else process.env.INTEGRATION_SECRET_KEY = saved;
});

describe("credential encryption", () => {
  test("round-trips a secret, and never produces the same ciphertext twice", () => {
    const a = encryptSecret("tok");
    const b = encryptSecret("tok");

    expect(isEncryptedSecret(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("tok");
  });

  test("encrypting twice does not double-wrap", () => {
    const once = encryptSecret("tok");
    expect(encryptSecret(once)).toBe(once);
  });

  test("a plaintext value reads through untouched, so rows can be backfilled later", () => {
    expect(decryptSecret("plain")).toBe("plain");
  });

  test("tampered ciphertext is refused", () => {
    const sealed = encryptSecret("tok");
    const bytes = Buffer.from(sealed.slice("enc:v1:".length), "base64");
    bytes[bytes.length - 1] ^= 1;

    expect(() => decryptSecret(`enc:v1:${bytes.toString("base64")}`)).toThrow();
  });

  test("encrypts only the secret fields, at any depth, and leaves lookup keys readable", () => {
    const credential = {
      access_token: "a",
      refresh_token: "r",
      api_domain: "https://www.zohoapis.in",
      crmWebhook: { channelId: "chan-1" },
      session: { shop: "demo.myshopify.com", accessToken: "shpat" },
      inbound: { token: "t", tokenHash: "h", secret: "s" },
      restaurantId: "rest-1",
      list: [{ apiKey: "k", label: "x" }],
    };

    const stored = encryptCredentialSecrets(credential) as any;

    for (const secret of [
      stored.access_token,
      stored.refresh_token,
      stored.session.accessToken,
      stored.inbound.token,
      stored.inbound.secret,
      stored.list[0].apiKey,
    ]) {
      expect(isEncryptedSecret(secret)).toBe(true);
    }
    expect(stored.api_domain).toBe(credential.api_domain);
    expect(stored.crmWebhook.channelId).toBe("chan-1");
    expect(stored.session.shop).toBe("demo.myshopify.com");
    expect(stored.inbound.tokenHash).toBe("h");
    expect(stored.restaurantId).toBe("rest-1");
    expect(stored.list[0].label).toBe("x");
    expect(decryptCredentialSecrets(stored)).toEqual(credential);
  });

  test("leaves non-JSON values — Prisma's null sentinels, empty strings — alone", () => {
    const sentinel = Object.create({ kind: "JsonNull" });
    expect(encryptCredentialSecrets(sentinel)).toBe(sentinel);
    expect(encryptCredentialSecrets({ apiKey: "" })).toEqual({ apiKey: "" });
    expect(encryptCredentialSecrets(null)).toBe(null);
  });

  test("without the key, secrets are stored as they are", () => {
    delete process.env.INTEGRATION_SECRET_KEY;
    expect(encryptSecret("tok")).toBe("tok");
  });

  test("without the key, an encrypted secret cannot be read — and says why", () => {
    const sealed = encryptSecret("tok");
    delete process.env.INTEGRATION_SECRET_KEY;
    expect(() => decryptSecret(sealed)).toThrow("INTEGRATION_SECRET_KEY is not set");
  });
});

describe("OAuth state", () => {
  test("carries the org and user through the round trip", () => {
    const state = signOAuthState({ orgId: "org-1", provider: "hubspot", userId: "u-1" });

    expect(verifyOAuthState(state, "hubspot")).toEqual({
      orgId: "org-1",
      provider: "hubspot",
      userId: "u-1",
    });
  });

  test("a state edited to point at another org is refused", () => {
    const state = signOAuthState({ orgId: "org-1", provider: "hubspot" });
    const [, signature] = state.split(".");
    const forged = Buffer.from(
      JSON.stringify({ orgId: "org-2", provider: "hubspot", exp: Date.now() + 60_000 }),
    ).toString("base64url");

    expect(() => verifyOAuthState(`${forged}.${signature}`, "hubspot")).toThrow("signature");
  });

  test("expires after ten minutes", () => {
    const state = signOAuthState({ orgId: "org-1", provider: "hubspot" }, 0);
    expect(() => verifyOAuthState(state, "hubspot", 11 * 60_000)).toThrow("expired");
  });

  test("cannot be replayed against another provider's callback", () => {
    const state = signOAuthState({ orgId: "org-1", provider: "hubspot" });
    expect(() => verifyOAuthState(state, "zoho")).toThrow("another provider");
  });

  test("needs the key to sign at all", () => {
    delete process.env.INTEGRATION_SECRET_KEY;
    expect(() => signOAuthState({ orgId: "org-1", provider: "hubspot" })).toThrow(
      "INTEGRATION_SECRET_KEY",
    );
  });
});
