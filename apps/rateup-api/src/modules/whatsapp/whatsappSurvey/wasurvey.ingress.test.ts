import crypto from "node:crypto";

import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const send = vi.fn();
const isKafkaProducerConnected = vi.fn();
const reconnectKafkaProducerInBackground = vi.fn();
vi.mock("../../../plugins/kafka.js", () => ({
  producer: { send },
  isKafkaProducerConnected,
  reconnectKafkaProducerInBackground,
}));

const processWhatsappWebhook = vi.fn();
vi.mock("./wasurvey.webhook.js", () => ({ processWhatsappWebhook }));
vi.mock("./wasurvey.controller.js", () => ({ webhookSubscribeHandler: vi.fn() }));

const { waWebhookRoutes } = await import("./wasurvey.route.js");

const APP_SECRET = "test-app-secret";
const CUSTOMER = "919188346187";
const PHONE_ID = "259643180556398";

const sign = (body: string, secret = APP_SECRET) =>
  `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;

/** Deliberately not what JSON.stringify would produce, to prove the raw bytes are kept. */
const MESSAGE_BODY = `{"object":"whatsapp_business_account", "entry":[{"id":"waba-1","changes":[{"field":"messages","value":{"metadata":{"phone_number_id":"${PHONE_ID}"},"contacts":[{"wa_id":"${CUSTOMER}"}],"messages":[{"from":"${CUSTOMER}","id":"wamid.1","type":"text","text":{"body":"hi"}}]}}]}]}`;

async function server() {
  const app = Fastify();
  await app.register(waWebhookRoutes);
  return app;
}

function deliver(app: Awaited<ReturnType<typeof server>>, body: string, signature?: string) {
  return app.inject({
    method: "POST",
    url: "/",
    headers: {
      "content-type": "application/json",
      ...(signature && { "x-hub-signature-256": signature }),
    },
    payload: body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.waclient_secret = APP_SECRET;
  isKafkaProducerConnected.mockReturnValue(true);
  send.mockResolvedValue([]);
});

afterEach(() => {
  delete process.env.META_WEBHOOK_SIGNATURES;
  delete process.env.WA_WEBHOOK_INGRESS;
  delete process.env.WA_WEBHOOK_PRODUCE_TIMEOUT_MS;
});

describe("WhatsApp webhook ingress", () => {
  test("publishes a signed delivery to wa-webhooks before answering 200", async () => {
    const app = await server();

    const res = await deliver(app, MESSAGE_BODY, sign(MESSAGE_BODY));

    expect(res.statusCode).toBe(200);
    expect(send).toHaveBeenCalledOnce();
    const [{ topic, acks, messages }] = send.mock.calls[0]!;
    expect(topic).toBe("wa-webhooks");
    expect(acks).toBe(-1);
    // Keyed by the customer, with the bytes Meta signed.
    expect(messages).toEqual([expect.objectContaining({ key: CUSTOMER, value: MESSAGE_BODY })]);
    expect(processWhatsappWebhook).not.toHaveBeenCalled();
  });

  test("turns away an unsigned delivery with 401, by default, and publishes nothing", async () => {
    const app = await server();

    const res = await deliver(app, MESSAGE_BODY);

    expect(res.statusCode).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  test("turns away a delivery signed with another secret", async () => {
    const app = await server();

    const res = await deliver(app, MESSAGE_BODY, sign(MESSAGE_BODY, "someone-else"));

    expect(res.statusCode).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  test("answers 503 when the publish fails, so Meta retries", async () => {
    send.mockRejectedValue(new Error("broker unavailable"));
    const app = await server();

    const res = await deliver(app, MESSAGE_BODY, sign(MESSAGE_BODY));

    expect(res.statusCode).toBe(503);
  });

  test("answers 503 without waiting when the producer is not connected, and reconnects", async () => {
    isKafkaProducerConnected.mockReturnValue(false);
    const app = await server();

    const res = await deliver(app, MESSAGE_BODY, sign(MESSAGE_BODY));

    expect(res.statusCode).toBe(503);
    expect(send).not.toHaveBeenCalled();
    expect(reconnectKafkaProducerInBackground).toHaveBeenCalledOnce();
  });

  test("answers 503 when the broker does not answer in time", async () => {
    process.env.WA_WEBHOOK_PRODUCE_TIMEOUT_MS = "20";
    send.mockReturnValue(new Promise(() => {}));
    const app = await server();

    const res = await deliver(app, MESSAGE_BODY, sign(MESSAGE_BODY));

    expect(res.statusCode).toBe(503);
  });

  test.each([
    ["no entries", `{"object":"whatsapp_business_account","entry":[]}`],
    ["no changes", `{"object":"whatsapp_business_account","entry":[{"id":"w","changes":[]}]}`],
    ["no entry field", `{"object":"whatsapp_business_account"}`],
  ])("answers 200 to a delivery with %s, publishing nothing", async (_name, body) => {
    const app = await server();

    const res = await deliver(app, body, sign(body));

    expect(res.statusCode).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  test("splits a delivery for two customers into a record each", async () => {
    const body = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: PHONE_ID },
                messages: [
                  { from: "911", id: "m1", type: "text", text: { body: "a" } },
                  { from: "922", id: "m2", type: "text", text: { body: "b" } },
                ],
              },
            },
          ],
        },
      ],
    });
    const app = await server();

    const res = await deliver(app, body, sign(body));

    expect(res.statusCode).toBe(200);
    // One send, so the delivery is accepted all or nothing.
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]![0].messages.map((m: { key: string }) => m.key)).toEqual([
      "911",
      "922",
    ]);
  });

  test("processes in the request instead under WA_WEBHOOK_INGRESS=inline", async () => {
    process.env.WA_WEBHOOK_INGRESS = "inline";
    const app = await server();

    const res = await deliver(app, MESSAGE_BODY, sign(MESSAGE_BODY));

    expect(res.statusCode).toBe(200);
    expect(send).not.toHaveBeenCalled();
    expect(processWhatsappWebhook).toHaveBeenCalledWith(JSON.parse(MESSAGE_BODY));
  });

  test("still accepts an unsigned delivery in log mode (the rollback)", async () => {
    process.env.META_WEBHOOK_SIGNATURES = "log";
    const app = await server();

    const res = await deliver(app, MESSAGE_BODY);

    expect(res.statusCode).toBe(200);
    expect(send).toHaveBeenCalledOnce();
  });
});
