import { createHmac } from "node:crypto";

import Fastify from "fastify";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("./hubspot.connect.js", () => ({
  findIntegrationByPortal: vi.fn(),
  getHubSpotPipelines: vi.fn(),
  getHubSpotStatus: vi.fn(),
  updateHubSpotSettings: vi.fn(),
}));

import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { findIntegrationByPortal } from "./hubspot.connect.js";
import { hubSpotPublicRoutes } from "./hubspot.route.js";
import type { HubSpotWebhookEvent } from "./hubspot.types.js";
import {
  enqueueHubSpotEvents,
  HUBSPOT_INBOUND,
  HubSpotSignatureError,
  verifyHubSpotSignature,
} from "./hubspot.webhook.js";

type Mock = ReturnType<typeof vi.fn>;
const addJob = integrationTriggerQueue.add as unknown as Mock;
const byPortal = findIntegrationByPortal as unknown as Mock;

const SECRET = "app-secret";
const URL = "https://api.rateup.test/api/public/integrations/hubspot/webhooks";
const NOW = 1_780_000_000_000;

const sign = (body: string, timestamp: string, url = URL, method = "POST") =>
  createHmac("sha256", SECRET).update(`${method}${url}${body}${timestamp}`).digest("base64");

const event = (over: Partial<HubSpotWebhookEvent> = {}): HubSpotWebhookEvent => ({
  eventId: 1,
  subscriptionType: "contact.propertyChange",
  portalId: 4401,
  objectId: 701,
  occurredAt: NOW,
  propertyName: "firstname",
  propertyValue: "Asha",
  ...over,
});

beforeAll(() => {
  process.env.API_URL = "https://api.rateup.test";
  process.env.HUBSPOT_CLIENT_SECRET = SECRET;
});

beforeEach(() => {
  vi.clearAllMocks();
  byPortal.mockResolvedValue({ id: "int-1", orgId: "org-1" });
});

describe("the v3 signature", () => {
  const body = JSON.stringify([event()]);
  const timestamp = String(NOW);
  const check = (over: Partial<Parameters<typeof verifyHubSpotSignature>[0]> = {}) =>
    verifyHubSpotSignature({
      method: "POST",
      url: URL,
      rawBody: body,
      signature: sign(body, timestamp),
      timestamp,
      secret: SECRET,
      now: NOW + 1000,
      ...over,
    });

  test("a delivery signed with the app's secret passes", () => {
    expect(() => check()).not.toThrow();
  });

  test("a changed body, URL or secret fails", () => {
    expect(() => check({ rawBody: body.replace("Asha", "Eve") })).toThrow(HubSpotSignatureError);
    expect(() => check({ url: `${URL}?x=1` })).toThrow(HubSpotSignatureError);
    expect(() => check({ secret: "other" })).toThrow(HubSpotSignatureError);
  });

  test("a delivery older than five minutes is refused as a replay", () => {
    expect(() => check({ now: NOW + 5 * 60 * 1000 + 1 })).toThrow("Stale");
  });

  test("missing headers, or no secret configured, fail", () => {
    expect(() => check({ signature: undefined })).toThrow("Missing");
    expect(() => check({ secret: undefined })).toThrow("not configured");
  });
});

describe("queuing a delivery", () => {
  test("one job per record: a contact's property changes and its creation share one", async () => {
    await enqueueHubSpotEvents([
      event({ subscriptionType: "contact.creation" }),
      event({ propertyName: "lastname" }),
      event({ propertyName: "email" }),
      event({ subscriptionType: "deal.propertyChange", objectId: 9001, propertyName: "dealstage" }),
    ]);

    expect(addJob).toHaveBeenCalledTimes(2);
    expect(addJob).toHaveBeenCalledWith(
      "hubspot-inbound",
      {
        integrationName: "hubspot",
        triggerKey: HUBSPOT_INBOUND,
        orgId: "org-1",
        data: { objectType: "contact", objectId: "701", created: true },
      },
      expect.objectContaining({
        jobId: `hubspot-in-int-1-contact-701-${Math.floor(NOW / 10_000)}-c`,
        delay: 10_000,
        removeOnComplete: true,
      }),
    );
    expect(addJob.mock.calls[1][1].data).toEqual({
      objectType: "deal",
      objectId: "9001",
      created: false,
    });
  });

  test("an account no org has connected, and objects RateUp does not follow, are skipped", async () => {
    byPortal.mockResolvedValue(null);
    await enqueueHubSpotEvents([event()]);
    byPortal.mockResolvedValue({ id: "int-1", orgId: "org-1" });
    await enqueueHubSpotEvents([event({ subscriptionType: "company.creation" })]);
    expect(addJob).not.toHaveBeenCalled();
  });

  test("the account is looked up once per delivery", async () => {
    await enqueueHubSpotEvents([event(), event({ objectId: 702 }), event({ objectId: 703 })]);
    expect(byPortal).toHaveBeenCalledTimes(1);
  });
});

describe("the public endpoint", () => {
  const app = async () => {
    const server = Fastify();
    await server.register(hubSpotPublicRoutes, { prefix: "/api/public/integrations/hubspot" });
    return server;
  };

  test("a signed delivery is queued and answered 200", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const body = JSON.stringify([event()]);
    const timestamp = String(NOW);
    const response = await (
      await app()
    ).inject({
      method: "POST",
      url: "/api/public/integrations/hubspot/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hubspot-signature-v3": sign(body, timestamp),
        "x-hubspot-request-timestamp": timestamp,
      },
      payload: body,
    });
    vi.useRealTimers();

    expect(response.statusCode).toBe(200);
    expect(addJob).toHaveBeenCalledTimes(1);
  });

  test("a delivery with a wrong signature is answered 401 and queues nothing", async () => {
    const response = await (
      await app()
    ).inject({
      method: "POST",
      url: "/api/public/integrations/hubspot/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hubspot-signature-v3": "bm9wZQ==",
        "x-hubspot-request-timestamp": String(Date.now()),
      },
      payload: JSON.stringify([event()]),
    });
    expect(response.statusCode).toBe(401);
    expect(addJob).not.toHaveBeenCalled();
  });
});
