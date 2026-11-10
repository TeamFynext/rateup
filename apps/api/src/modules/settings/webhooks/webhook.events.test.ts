import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({
  default: { webhook: { findUnique: vi.fn() } },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  outgoingWebhookQueue: { addBulk: vi.fn() },
}));

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { outgoingWebhookQueue } from "../../../workers/bullmq/queues/index.js";
import {
  __resetWebhookSubscriptionCache,
  buildWebhookEnvelope,
  emitWebhookEvent,
  emitWebhookEvents,
  getSubscribedEvents,
  invalidateWebhookSubscriptions,
  OUTGOING_WEBHOOK_JOB_OPTIONS,
  SUBSCRIPTION_TTL_MS,
} from "./webhook.events.js";

type Mock = ReturnType<typeof vi.fn>;
const findUnique = (prisma as unknown as { webhook: { findUnique: Mock } }).webhook.findUnique;
const addBulk = (outgoingWebhookQueue as unknown as { addBulk: Mock }).addBulk;

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** The jobs passed to the one `addBulk` call. */
const queued = () => (addBulk.mock.calls[0]?.[0] ?? []) as any[];

beforeEach(() => {
  vi.clearAllMocks();
  __resetWebhookSubscriptionCache();
  findUnique.mockResolvedValue({ events: ["message.status", "loyalty.points.earned"] });
  addBulk.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildWebhookEnvelope", () => {
  test("is { id, type, createdAt, orgId, data } with a fresh uuid", () => {
    const now = new Date("2026-10-16T10:00:00.000Z");
    const a = buildWebhookEnvelope(ORG, "message.status", { status: "read" }, now);
    const b = buildWebhookEnvelope(ORG, "message.status", { status: "read" }, now);

    expect(a).toEqual({
      id: expect.stringMatching(UUID),
      type: "message.status",
      createdAt: "2026-10-16T10:00:00.000Z",
      orgId: ORG,
      data: { status: "read" },
    });
    expect(Object.keys(a)).toEqual(["id", "type", "createdAt", "orgId", "data"]);
    expect(a.id).not.toBe(b.id);
  });
});

describe("emitWebhookEvents — enqueue only when subscribed", () => {
  test("queues a subscribed event as an envelope job keyed on its id", async () => {
    const count = await emitWebhookEvents([
      { orgId: ORG, type: "message.status", data: { messageId: "wamid.1" } },
    ]);

    expect(count).toBe(1);
    const [job] = queued();
    expect(job.name).toBe("message.status");
    expect(job.data).toEqual({
      kind: "envelope",
      orgId: ORG,
      event: "message.status",
      envelope: expect.objectContaining({
        type: "message.status",
        orgId: ORG,
        data: { messageId: "wamid.1" },
      }),
    });
    // Job id = envelope id = X-Webhook-Id, the same on every retry.
    expect(job.opts).toEqual({ ...OUTGOING_WEBHOOK_JOB_OPTIONS, jobId: job.data.envelope.id });
  });

  test("queues nothing for an event the org did not subscribe to", async () => {
    const count = await emitWebhookEvents([
      { orgId: ORG, type: "survey.response.created", data: {} },
    ]);

    expect(count).toBe(0);
    expect(addBulk).not.toHaveBeenCalled();
  });

  test("queues nothing for an org with no webhook", async () => {
    findUnique.mockResolvedValue(null);

    await emitWebhookEvent({ orgId: ORG, type: "message.status", data: {} });

    expect(addBulk).not.toHaveBeenCalled();
  });

  test("filters a mixed batch per org, in one Redis round trip", async () => {
    findUnique.mockImplementation(async ({ where }: any) =>
      where.orgId === ORG ? { events: ["message.status"] } : { events: [] },
    );

    await emitWebhookEvents([
      { orgId: ORG, type: "message.status", data: { n: 1 } },
      { orgId: OTHER, type: "message.status", data: { n: 2 } },
      { orgId: ORG, type: "message.status", data: { n: 3 } },
    ]);

    expect(addBulk).toHaveBeenCalledTimes(1);
    expect(queued().map((j) => j.data.envelope.data.n)).toEqual([1, 3]);
  });

  test("a lazy payload is built only when the org is subscribed", async () => {
    const build = vi.fn(() => ({ a: 1 }));

    await emitWebhookEvent({ orgId: ORG, type: "loyalty.points.redeemed", data: build });
    expect(build).not.toHaveBeenCalled();

    await emitWebhookEvent({ orgId: ORG, type: "loyalty.points.earned", data: build });
    expect(build).toHaveBeenCalledTimes(1);
    expect(queued()[0].data.envelope.data).toEqual({ a: 1 });
  });
});

describe("emitWebhookEvents — never throws into the caller", () => {
  test("a failed subscription lookup is logged, not thrown", async () => {
    findUnique.mockRejectedValue(new Error("db down"));

    await expect(emitWebhookEvent({ orgId: ORG, type: "message.status", data: {} })).resolves.toBe(
      false,
    );
    expect(log.error).toHaveBeenCalled();
  });

  test("a failed enqueue is logged, not thrown", async () => {
    addBulk.mockRejectedValue(new Error("redis down"));

    await expect(
      emitWebhookEvents([{ orgId: ORG, type: "message.status", data: {} }]),
    ).resolves.toBe(0);
    expect(log.error).toHaveBeenCalled();
  });

  test("a payload builder that throws drops only its own event", async () => {
    await emitWebhookEvents([
      {
        orgId: ORG,
        type: "message.status",
        data: () => {
          throw new Error("boom");
        },
      },
      { orgId: ORG, type: "message.status", data: { ok: true } },
    ]);

    expect(queued().map((j) => j.data.envelope.data)).toEqual([{ ok: true }]);
    expect(log.error).toHaveBeenCalledTimes(1);
  });
});

describe("subscription cache", () => {
  test("one query serves repeated lookups within the TTL", async () => {
    await getSubscribedEvents(ORG);
    await getSubscribedEvents(ORG);
    await emitWebhookEvent({ orgId: ORG, type: "message.status", data: {} });

    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  test("concurrent lookups share one query", async () => {
    await Promise.all([getSubscribedEvents(ORG), getSubscribedEvents(ORG)]);

    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  test("re-reads after the TTL", async () => {
    vi.useFakeTimers();
    await getSubscribedEvents(ORG);
    vi.advanceTimersByTime(SUBSCRIPTION_TTL_MS + 1);
    await getSubscribedEvents(ORG);

    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  test("caches 'no webhook' too", async () => {
    findUnique.mockResolvedValue(null);
    await getSubscribedEvents(ORG);
    await getSubscribedEvents(ORG);

    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  test("invalidation forces a fresh read", async () => {
    await getSubscribedEvents(ORG);
    invalidateWebhookSubscriptions(ORG);
    findUnique.mockResolvedValue({ events: ["survey.response.created"] });

    expect([...(await getSubscribedEvents(ORG))]).toEqual(["survey.response.created"]);
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
