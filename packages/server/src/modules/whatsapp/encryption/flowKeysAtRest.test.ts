import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  FLOW_KEYS_ENVELOPE_VERSION,
  isSealedFlowKeys,
  openFlowKeys,
  sealFlowKeys,
} from "./flowKeysAtRest.js";

const KEY_A = "11".repeat(32);
const KEY_B = "22".repeat(32);

const keys: WaEncryptionKeys = {
  publicKey: "-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----\n",
  privateKey: "-----BEGIN RSA PRIVATE KEY-----\nBBBB\n-----END RSA PRIVATE KEY-----\n",
  passphrase: "0123456789abcdef0123456789abcdef",
};

const original = process.env.wa_access_token_encryption_key;
beforeEach(() => {
  process.env.wa_access_token_encryption_key = KEY_A;
});
afterEach(() => {
  if (original === undefined) delete process.env.wa_access_token_encryption_key;
  else process.env.wa_access_token_encryption_key = original;
});

describe("sealFlowKeys", () => {
  test("stores a versioned GCM envelope with nothing readable in it", () => {
    const sealed = sealFlowKeys(keys);

    expect(sealed.v).toBe(FLOW_KEYS_ENVELOPE_VERSION);
    expect(sealed.iv).toMatch(/^[0-9a-f]{32}$/);
    expect(sealed.enc).toMatch(/^gcm1:[0-9a-f]+:[0-9a-f]{32}$/);
    expect(Object.keys(sealed).sort()).toEqual(["enc", "iv", "v"]);
    const json = JSON.stringify(sealed);
    expect(json).not.toContain(keys.passphrase);
    expect(json).not.toContain("PRIVATE KEY");
  });

  test("a fresh IV every time", () => {
    expect(sealFlowKeys(keys).enc).not.toBe(sealFlowKeys(keys).enc);
  });

  test("an already-sealed value is returned as it is (no double encryption)", () => {
    const sealed = sealFlowKeys(keys);
    expect(sealFlowKeys(sealed)).toBe(sealed);
  });

  test("only the three key fields are sealed", () => {
    const sealed = sealFlowKeys({ ...keys, extra: "x" } as WaEncryptionKeys);
    expect(openFlowKeys(sealed)).toEqual(keys);
  });

  test("refuses an incomplete key set", () => {
    expect(() =>
      sealFlowKeys({ publicKey: "p", privateKey: "k" } as unknown as WaEncryptionKeys),
    ).toThrow(/publicKey, privateKey, and passphrase/);
  });

  test("refuses to run without the at-rest key", () => {
    delete process.env.wa_access_token_encryption_key;
    expect(() => sealFlowKeys(keys)).toThrow("wa_access_token_encryption_key is not configured");
  });
});

describe("openFlowKeys", () => {
  test("round trip", () => {
    expect(openFlowKeys(sealFlowKeys(keys))).toEqual(keys);
  });

  test("a legacy plain row is read as it is", () => {
    expect(openFlowKeys({ ...keys })).toEqual(keys);
  });

  test("a legacy plain row needs no at-rest key", () => {
    delete process.env.wa_access_token_encryption_key;
    expect(openFlowKeys({ ...keys })).toEqual(keys);
  });

  test("an empty column is null", () => {
    expect(openFlowKeys(null)).toBeNull();
    expect(openFlowKeys(undefined)).toBeNull();
  });

  test("the wrong key fails instead of returning garbage", () => {
    const sealed = sealFlowKeys(keys);
    process.env.wa_access_token_encryption_key = KEY_B;
    expect(() => openFlowKeys(sealed)).toThrow();
  });

  test("a tampered ciphertext fails", () => {
    const sealed = sealFlowKeys(keys);
    const [prefix, ct, tag] = sealed.enc.split(":");
    const flipped = (ct[0] === "0" ? "1" : "0") + ct.slice(1);
    expect(() => openFlowKeys({ ...sealed, enc: `${prefix}:${flipped}:${tag}` })).toThrow();
    expect(() => openFlowKeys({ ...sealed, iv: "00".repeat(16) })).toThrow();
  });

  test("an unrecognised value fails rather than being used as keys", () => {
    expect(() => openFlowKeys({ publicKey: "only" })).toThrow(/unrecognised/);
    expect(() => openFlowKeys("plain string")).toThrow(/unrecognised/);
    expect(() => openFlowKeys({ v: 2, iv: "x", enc: "y" })).toThrow(/unrecognised/);
  });

  test("isSealedFlowKeys tells the two forms apart", () => {
    expect(isSealedFlowKeys(sealFlowKeys(keys))).toBe(true);
    expect(isSealedFlowKeys(keys)).toBe(false);
    expect(isSealedFlowKeys(null)).toBe(false);
  });
});
