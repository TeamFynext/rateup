import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: { integration: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("./pipedrive.client.js", () => ({ pipedriveClientFor: vi.fn(async () => client) }));

import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { InboundWebhookRejected } from "../shared/inboundWebhookContract.js";
import {
  handlePipedriveInbound,
  isPipedriveDeliveryAuthorized,
  removePipedriveWebhooks,
  syncPipedriveWebhooks,
} from "./pipedrive.webhooks.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma.integration as unknown as Record<string, Mock>;
const addJob = integrationTriggerQueue.add as unknown as Mock;

const URL = "https://api.test/api/public/integrations/webhooks/pipedrive/int-1";

const credential = (over: Record<string, unknown> = {}) => ({
  access_token: "at",
  refresh_token: "rt",
  apiDomain: "https://acme.pipedrive.com",
  companyId: 9100,
  connectedAt: "2026-10-01T00:00:00.000Z",
  webhookSecret: "s3cret",
  syncContacts: true,
  syncDeals: true,
  ...over,
});

const integration = (over: Record<string, unknown> = {}) =>
  ({ id: "int-1", orgId: "org-1", credential: credential(over) }) as never;

const basic = (user: string, password: string) =>
  `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

const delivery = (
  meta: Record<string, unknown> = {},
  authorization: string | undefined = basic("rateup", "s3cret"),
) =>
  ({
    headers: { authorization },
    body: {
      meta: {
        action: "change",
        entity: "person",
        entity_id: "77",
        company_id: "9100",
        timestamp: "2026-10-07T10:00:03.000Z",
        ...meta,
      },
      data: { id: 77 },
    },
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.API_URL = "https://api.test";
  client.get.mockResolvedValue({ data: { data: [] } });
  client.post
    .mockResolvedValueOnce({ data: { data: { id: 101 } } })
    .mockResolvedValueOnce({ data: { data: { id: 102 } } });
  client.delete.mockResolvedValue({});
  db.findUnique.mockResolvedValue({ credential: credential({ syncContacts: false }) });
});

describe("registering the webhooks", () => {
  test("creates a v2 person and deal webhook with Basic credentials, and keeps their ids", async () => {
    expect(await syncPipedriveWebhooks(integration())).toEqual([
      { id: 101, object: "person" },
      { id: 102, object: "deal" },
    ]);
    expect(client.post).toHaveBeenCalledWith("/v1/webhooks", {
      subscription_url: URL,
      event_action: "*",
      event_object: "person",
      http_auth_user: "rateup",
      http_auth_password: "s3cret",
      version: "2.0",
    });
    // Saved onto the row as it is now: a setting changed meanwhile stays.
    expect(db.update.mock.calls[0][0].data.credential).toMatchObject({
      syncContacts: false,
      webhookSecret: "s3cret",
      webhooks: [
        { id: 101, object: "person" },
        { id: 102, object: "deal" },
      ],
    });
  });

  test("keeps a live one, re-creates the one Pipedrive deleted, and clears strays", async () => {
    client.get.mockResolvedValue({
      data: {
        data: [
          { id: 5, event_object: "person", subscription_url: URL, is_active: true },
          { id: 9, event_object: "deal", subscription_url: URL, is_active: true },
          { id: 8, event_object: "deal", subscription_url: "https://elsewhere", is_active: true },
        ],
      },
    });

    const kept = await syncPipedriveWebhooks(
      integration({
        webhooks: [
          { id: 5, object: "person" },
          { id: 6, object: "deal" },
        ],
      }),
    );

    expect(kept).toEqual([
      { id: 5, object: "person" },
      { id: 101, object: "deal" },
    ]);
    expect(client.delete).toHaveBeenCalledWith("/v1/webhooks/9");
    expect(client.delete).not.toHaveBeenCalledWith("/v1/webhooks/8");
    expect(client.post).toHaveBeenCalledOnce();
  });

  test("a connection from before webhooks gets a secret", async () => {
    await syncPipedriveWebhooks(integration({ webhookSecret: undefined }));
    const saved = db.update.mock.calls[0][0].data.credential.webhookSecret;
    expect(saved).toMatch(/^[\w-]{32}$/);
    expect(client.post.mock.calls[0][1].http_auth_password).toBe(saved);
  });

  test("disconnecting deletes them, past one already gone", async () => {
    client.delete.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
    await removePipedriveWebhooks(
      integration({
        webhooks: [
          { id: 5, object: "person" },
          { id: 6, object: "deal" },
        ],
      }),
    );
    expect(client.delete).toHaveBeenCalledTimes(2);
  });
});

describe("a delivery's credentials", () => {
  test.each([
    [basic("rateup", "s3cret"), true],
    [basic("rateup", "wrong"), false],
    [basic("someone", "s3cret"), false],
    ["Bearer s3cret", false],
    [undefined, false],
  ])("%s → %s", (header, expected) => {
    expect(isPipedriveDeliveryAuthorized(header, "s3cret")).toBe(expected);
  });

  test("nothing passes when the integration has no secret", () => {
    expect(isPipedriveDeliveryAuthorized(basic("rateup", ""), undefined)).toBe(false);
  });
});

describe("receiving a delivery", () => {
  test("a wrong password is refused", async () => {
    await expect(
      handlePipedriveInbound(integration(), delivery({}, basic("rateup", "nope"))),
    ).rejects.toBeInstanceOf(InboundWebhookRejected);
    expect(addJob).not.toHaveBeenCalled();
  });

  test("a change queues one delayed job per record per window", async () => {
    await handlePipedriveInbound(integration(), delivery());
    expect(addJob).toHaveBeenCalledWith(
      "pipedrive-inbound",
      expect.objectContaining({
        integrationName: "pipedrive",
        orgId: "org-1",
        data: { object: "person", id: "77", created: false },
      }),
      expect.objectContaining({
        jobId: `pipedrive-in-int-1-person-77-${Math.floor(Date.parse("2026-10-07T10:00:03.000Z") / 10_000)}`,
        delay: 10_000,
      }),
    );
  });

  test("a new record is marked created, with a job id of its own", async () => {
    await handlePipedriveInbound(integration(), delivery({ action: "create", entity: "deal" }));
    const [, job, options] = addJob.mock.calls[0];
    expect(job.data).toEqual({ object: "deal", id: "77", created: true });
    expect(options.jobId).toMatch(/-c$/);
  });

  test("other objects, another company, and switched-off syncs queue nothing", async () => {
    await handlePipedriveInbound(integration(), delivery({ entity: "activity" }));
    await handlePipedriveInbound(integration(), delivery({ company_id: "1" }));
    await handlePipedriveInbound(
      integration({ syncContacts: false, importContacts: false }),
      delivery(),
    );
    expect(addJob).not.toHaveBeenCalled();
  });

  test("an import switch alone is enough to listen", async () => {
    await handlePipedriveInbound(
      integration({ syncContacts: false, importContacts: true }),
      delivery({ action: "create" }),
    );
    expect(addJob).toHaveBeenCalledOnce();
  });
});
