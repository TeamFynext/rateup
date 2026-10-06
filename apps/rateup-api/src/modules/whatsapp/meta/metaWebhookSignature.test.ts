import crypto from "node:crypto";

import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { log } from "../../../utils/logger.js";
import { registerMetaWebhookRawBody, verifyMetaWebhookSignature } from "./metaWebhookSignature.js";

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

// The default, so switching it on cannot silently drop real traffic signed with a
// secret this deployment does not have.
describe("verifyMetaWebhookSignature - log (default)", () => {
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
