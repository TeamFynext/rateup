import { beforeEach, describe, expect, test, vi } from "vitest";
import crypto from "node:crypto";

vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettings: vi.fn(),
  updateWaSettings: vi.fn(),
}));
vi.mock("./wa_encryption.service.js", () => ({ setBusinessPublicKey: vi.fn() }));
vi.mock("../flows/flow.service.js", () => ({
  getFlowFromDb: vi.fn(),
  handleDecryptedFlowRequest: vi.fn(),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { getWaSettings } from "../settings/wa_settings.service.js";
import { getFlowFromDb, handleDecryptedFlowRequest } from "../flows/flow.service.js";
import { unusableRequest } from "../flows/flow.errors.js";
import {
  decryptRequest,
  encryptResponse,
  generateKeyPairsForWaEncryption,
  handleFlowResponse,
  isRequestSignatureValid,
} from "./wa_encryption.utils.js";

type Mock = ReturnType<typeof vi.fn>;
const getWaSettingsMock = getWaSettings as unknown as Mock;
const getFlowFromDbMock = getFlowFromDb as unknown as Mock;
const handleDecryptedMock = handleDecryptedFlowRequest as unknown as Mock;

const APP_SECRET = "test-app-secret";
const PASSPHRASE = "test-passphrase";
const keys = generateKeyPairsForWaEncryption(PASSPHRASE);

/** Builds the encrypted envelope WhatsApp posts to the endpoint. */
function encryptedRequest(payload: object) {
  const aesKey = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-128-gcm", aesKey, iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf-8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const encryptedAesKey = crypto.publicEncrypt(
    { key: keys.publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    aesKey,
  );
  return {
    body: {
      encrypted_flow_data: body.toString("base64"),
      encrypted_aes_key: encryptedAesKey.toString("base64"),
      initial_vector: iv.toString("base64"),
    },
    aesKey,
    iv,
  };
}

function sign(rawBody: string) {
  return `sha256=${crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex")}`;
}

function request(body: object, { signed = true }: { signed?: boolean } = {}): any {
  const rawBody = JSON.stringify(body);
  return {
    params: { orgId: "org-1", dbFlowId: "flow-1" },
    body,
    rawBody,
    ip: "1.2.3.4",
    headers: signed ? { "x-hub-signature-256": sign(rawBody) } : {},
  };
}

function reply() {
  const rep: any = {
    status: vi.fn(() => rep),
    send: vi.fn(() => rep),
  };
  return rep;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.waclient_secret = APP_SECRET;
  getWaSettingsMock.mockResolvedValue({
    orgId: "org-1",
    phoneId: "phone-1",
    accessToken: "token",
    encryption: keys,
  });
  getFlowFromDbMock.mockResolvedValue({ name: "Feedback", status: "PUBLISHED", orgId: "org-1" });
  handleDecryptedMock.mockResolvedValue({ version: "3.0", screen: "SCREEN_A", data: {} });
});

describe("isRequestSignatureValid", () => {
  test("accepts a correctly signed body", () => {
    expect(isRequestSignatureValid(request({ a: 1 }))).toEqual({ valid: true });
  });

  // A secret pasted from a dashboard or env file often carries a newline, which
  // changes the digest and is invisible in a log line.
  test("accepts a signature made with an untrimmed secret", () => {
    process.env.waclient_secret = `${APP_SECRET}\n`;

    expect(isRequestSignatureValid(request({ a: 1 })).valid).toBe(true);
  });

  test("rejects a body that was altered after signing", () => {
    const req = request({ a: 1 });
    req.rawBody = JSON.stringify({ a: 2 });

    expect(isRequestSignatureValid(req)).toMatchObject({
      valid: false,
      reason: "signature-mismatch",
    });
  });

  test.each([
    [
      "no signature header",
      (req: any) => delete req.headers["x-hub-signature-256"],
      "no-signature-header",
    ],
    [
      "a header that is not sha256-prefixed",
      (req: any) => (req.headers["x-hub-signature-256"] = "deadbeef"),
      "malformed-signature-header",
    ],
    [
      "a signature of the wrong length",
      (req: any) => (req.headers["x-hub-signature-256"] = "sha256=abcd"),
      "signature-mismatch",
    ],
    // Without the raw bytes the hash can never match, so failing closed is the
    // only safe answer — a re-serialized body would hash differently.
    ["no captured raw body", (req: any) => delete req.rawBody, "no-raw-body"],
  ])("rejects %s", (_label, mutate, reason) => {
    const req = request({ a: 1 });
    mutate(req);

    expect(isRequestSignatureValid(req)).toMatchObject({ valid: false, reason });
  });

  test("rejects everything when the app secret is unset", () => {
    delete process.env.waclient_secret;

    expect(isRequestSignatureValid(request({ a: 1 }))).toMatchObject({
      valid: false,
      reason: "no-app-secret",
    });
  });
});

describe("decryptRequest / encryptResponse", () => {
  test("round-trips the payload WhatsApp sends", () => {
    const { body } = encryptedRequest({ action: "ping", version: "3.0" });

    const { decryptedBody } = decryptRequest(body, keys.privateKey, PASSPHRASE);

    expect(decryptedBody).toEqual({ action: "ping", version: "3.0" });
  });

  test("raises a 421 when the AES key cannot be decrypted", () => {
    const other = generateKeyPairsForWaEncryption("other");
    const { body } = encryptedRequest({ action: "ping" });

    expect(() => decryptRequest(body, other.privateKey, "other")).toThrow();
    try {
      decryptRequest(body, other.privateKey, "other");
    } catch (e) {
      expect((e as { statusCode: number }).statusCode).toBe(421);
    }
  });

  // Meta decrypts our reply with the request IV inverted bit by bit.
  test("encrypts the response under the flipped initial vector", () => {
    const { aesKey, iv } = encryptedRequest({});
    const encrypted = Buffer.from(encryptResponse({ ok: true }, aesKey, iv), "base64");

    const flipped = Buffer.from(iv.map((b) => ~b & 0xff));
    const decipher = crypto.createDecipheriv("aes-128-gcm", aesKey, flipped);
    decipher.setAuthTag(encrypted.subarray(-16));
    const plain = Buffer.concat([
      decipher.update(encrypted.subarray(0, -16)),
      decipher.final(),
    ]).toString("utf-8");

    expect(JSON.parse(plain)).toEqual({ ok: true });
  });
});

describe("handleFlowResponse", () => {
  test("answers a signed request with the encrypted next screen", async () => {
    const { body } = encryptedRequest({ action: "INIT", version: "3.0" });
    const rep = reply();

    await handleFlowResponse(request(body), rep);

    expect(rep.status).not.toHaveBeenCalled();
    expect(typeof rep.send.mock.calls[0][0]).toBe("string");
  });

  // 427 is the documented code for a request we understand but must not serve.
  test("answers 427 for an unsigned request", async () => {
    const { body } = encryptedRequest({ action: "INIT" });
    const rep = reply();

    await handleFlowResponse(request(body, { signed: false }), rep);

    expect(rep.status).toHaveBeenCalledWith(427);
    expect(getWaSettingsMock).not.toHaveBeenCalled();
  });

  test("answers 421 when the request cannot be decrypted", async () => {
    const other = generateKeyPairsForWaEncryption("other");
    getWaSettingsMock.mockResolvedValue({
      orgId: "org-1",
      phoneId: "phone-1",
      accessToken: "token",
      encryption: other,
    });
    const { body } = encryptedRequest({ action: "INIT" });
    const rep = reply();

    await handleFlowResponse(request(body), rep);

    expect(rep.status).toHaveBeenCalledWith(421);
  });

  // A run we cannot serve closes the flow with a message, rather than a 500 that
  // Meta would retry against a run that will never resolve.
  test("answers a refused run with its status and an encrypted error message", async () => {
    handleDecryptedMock.mockRejectedValue(
      unusableRequest("no run", "This survey is no longer available"),
    );
    const { body, aesKey, iv } = encryptedRequest({ action: "data_exchange" });
    const rep = reply();

    await handleFlowResponse(request(body), rep);

    expect(rep.status).toHaveBeenCalledWith(427);
    const encrypted = Buffer.from(rep.send.mock.calls[0][0], "base64");
    const flipped = Buffer.from(iv.map((b) => ~b & 0xff));
    const decipher = crypto.createDecipheriv("aes-128-gcm", aesKey, flipped);
    decipher.setAuthTag(encrypted.subarray(-16));
    const plain = Buffer.concat([
      decipher.update(encrypted.subarray(0, -16)),
      decipher.final(),
    ]).toString("utf-8");
    expect(JSON.parse(plain)).toEqual({ error_msg: "This survey is no longer available" });
  });

  test("answers 500 for an unexpected failure", async () => {
    handleDecryptedMock.mockRejectedValue(new Error("db is down"));
    const { body } = encryptedRequest({ action: "data_exchange" });
    const rep = reply();

    await handleFlowResponse(request(body), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
  });
});
