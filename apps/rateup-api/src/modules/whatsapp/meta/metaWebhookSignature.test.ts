import crypto from "node:crypto";

import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { log } from "../../../utils/logger.js";
import {
  registerMetaWebhookRawBody,
  signatureMode,
  verifyMetaWebhookSignature,
} from "./metaWebhookSignature.js";

const APP_SECRET = "test-app-secret";
const BODY = JSON.stringify({ object: "instagram", entry: [{ id: "iba-1" }] });

const sign = (body: string, secret = APP_SECRET) =>
  `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;

/** A route wired the way the WhatsApp, Instagram and Messenger webhooks are. */
async function webhookServer() {
  const handler = vi.fn(async () => "ok");
  const server = Fastify();
  await server.register(async (scoped) => {
    await registerMetaWebhookRawBody(scoped);
    scoped.post(
      "/webhook",
      { config: { rawBody: true }, preHandler: verifyMetaWebhookSignature },
      handler,
    );
  });
  return { server, handler };
}

function deliver(server: Awaited<ReturnType<typeof webhookServer>>["server"], signature?: string) {
  return server.inject({
    method: "POST",
    url: "/webhook",
    headers: {
      "content-type": "application/json",
      ...(signature && { "x-hub-signature-256": signature }),
    },
    payload: BODY,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.waclient_secret = APP_SECRET;
});

afterEach(() => {
  delete process.env.META_WEBHOOK_SIGNATURES;
});

describe("verifyMetaWebhookSignature - enforce", () => {
  beforeEach(() => {
    process.env.META_WEBHOOK_SIGNATURES = "enforce";
  });

  test("lets a delivery signed with the app secret through", async () => {
    const { server, handler } = await webhookServer();

    const res = await deliver(server, sign(BODY));

    expect(res.statusCode).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  test.each([
    ["no signature", undefined],
    ["a signature made with another secret", sign(BODY, "someone-else")],
    ["a signature over a different body", sign(`${BODY} `)],
  ])("turns away a delivery with %s", async (_name, signature) => {
    const { server, handler } = await webhookServer();

    const res = await deliver(server, signature);

    expect(res.statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("verifyMetaWebhookSignature - default", () => {
  test.each([
    ["unset", undefined],
    ["empty", ""],
    ["a typo", "enforced"],
  ])("enforces when the mode is %s", async (_name, mode) => {
    if (mode !== undefined) process.env.META_WEBHOOK_SIGNATURES = mode;
    const { server, handler } = await webhookServer();

    const unsigned = await deliver(server);
    const signed = await deliver(server, sign(BODY));

    expect(unsigned.statusCode).toBe(401);
    expect(signed.statusCode).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  test("refuses everything when the app secret is missing", async () => {
    delete process.env.waclient_secret;
    const { server, handler } = await webhookServer();

    const res = await deliver(server, sign(BODY));

    expect(res.statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});

// The rollback: deliveries signed with a secret this deployment does not have
// still get processed, with a warning to go and find out why.
describe("verifyMetaWebhookSignature - log", () => {
  beforeEach(() => {
    process.env.META_WEBHOOK_SIGNATURES = "log";
  });

  test("still processes an unsigned delivery, but reports it", async () => {
    const { server, handler } = await webhookServer();

    const res = await deliver(server);

    expect(res.statusCode).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "no-signature-header", mode: "log" }),
      expect.any(String),
    );
  });

  test("says nothing about a correctly signed delivery", async () => {
    const { server } = await webhookServer();

    await deliver(server, sign(BODY));

    expect(log.warn).not.toHaveBeenCalled();
  });
});

describe("verifyMetaWebhookSignature - off", () => {
  test("neither checks nor reports", async () => {
    process.env.META_WEBHOOK_SIGNATURES = "off";
    const { server, handler } = await webhookServer();

    await deliver(server);

    expect(handler).toHaveBeenCalledOnce();
    expect(log.warn).not.toHaveBeenCalled();
  });
});

describe("signatureMode", () => {
  test("off is honoured only in a development runtime", () => {
    expect(signatureMode({ META_WEBHOOK_SIGNATURES: "off", NODE_ENV: "development" })).toBe("off");
    expect(signatureMode({ META_WEBHOOK_SIGNATURES: "off", RAILWAY_ENVIRONMENT_NAME: "dev" })).toBe(
      "off",
    );
  });

  test("off enforces in production, where NODE_ENV is unset", () => {
    expect(signatureMode({ META_WEBHOOK_SIGNATURES: "off" })).toBe("enforce");
    expect(
      signatureMode({ META_WEBHOOK_SIGNATURES: "off", RAILWAY_ENVIRONMENT_NAME: "production" }),
    ).toBe("enforce");
  });

  test("log stays available as the rollback; anything else enforces", () => {
    expect(signatureMode({ META_WEBHOOK_SIGNATURES: "log" })).toBe("log");
    expect(signatureMode({ META_WEBHOOK_SIGNATURES: "of" })).toBe("enforce");
    expect(signatureMode({})).toBe("enforce");
  });
});
