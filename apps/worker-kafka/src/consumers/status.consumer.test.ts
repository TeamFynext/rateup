import { beforeEach, describe, expect, it, vi } from "vitest";

const bulkUpdateStatuses = vi.fn();
const enqueueStatusRetries = vi.fn();

vi.mock("@rateup/server/workers/shared/whatsapp/index.js", () => ({ bulkUpdateStatuses }));
vi.mock("@rateup/server/workers/bullmq/queues/statusRetry.queue.js", () => ({
  enqueueStatusRetries,
}));
vi.mock("@rateup/server/workers/shared/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { planSkippedReceipts, startStatusConsumer } = await import("./status.consumer.js");
const { MAX_RETRIES, retryDelayMs } = await import("./statusRetry.js");

const now = new Date("2026-10-17T00:00:00.000Z");

describe("planSkippedReceipts", () => {
  it("leaves applied receipts alone", () => {
    const plan = planSkippedReceipts(
      [{ id: "1", value: { messageId: "wamid.A", status: "sent" } }],
      new Set(["1"]),
      now,
    );
    expect(plan).toEqual({ retries: [], dlq: [] });
  });

  it("schedules a skipped receipt with the backoff for its round", () => {
    const plan = planSkippedReceipts(
      [
        { id: "1", value: { messageId: "wamid.A", status: "SENT" } },
        { id: "2", value: { messageId: "wamid.B", status: "read", retryCount: 4 } },
      ],
      new Set(),
      now,
    );

    expect(plan.dlq).toEqual([]);
    expect(plan.retries).toHaveLength(2);
    const [first, second] = plan.retries;

    expect(first).toMatchObject({
      key: "wamid.A",
      messageId: "wamid.A",
      status: "sent",
      retryCount: 1,
      delayMs: retryDelayMs(0),
    });
    expect(JSON.parse(first.value)).toMatchObject({ retryCount: 1, retriedAt: now.toISOString() });

    expect(second).toMatchObject({ retryCount: 5, delayMs: retryDelayMs(4) });
    expect(second.delayMs).toBe(4000);
  });

  it("dead-letters a receipt that has used up its rounds", () => {
    const plan = planSkippedReceipts(
      [{ id: "1", value: { messageId: "wamid.A", status: "sent", retryCount: MAX_RETRIES } }],
      new Set(),
      now,
    );
    expect(plan.retries).toEqual([]);
    expect(plan.dlq).toHaveLength(1);
    expect(JSON.parse(plan.dlq[0].value)).toMatchObject({
      finalRetryCount: MAX_RETRIES,
      droppedAt: now.toISOString(),
    });
  });
});

describe("status consumer batch", () => {
  type EachBatch = (payload: any) => Promise<void>;
  let eachBatch: EachBatch;
  const producerSend = vi.fn();

  const fakeKafka = {
    consumer: () => ({
      connect: vi.fn(),
      subscribe: vi.fn(),
      run: vi.fn(async (opts: { eachBatch: EachBatch }) => {
        eachBatch = opts.eachBatch;
      }),
    }),
    producer: () => ({
      on: vi.fn(),
      events: { DISCONNECT: "producer.disconnect" },
      connect: vi.fn(),
      send: producerSend,
    }),
  };

  const batchOf = (...values: object[]) => {
    const resolveOffset = vi.fn();
    const commitOffsetsIfNecessary = vi.fn();
    return {
      payload: {
        batch: {
          messages: values.map((v, i) => ({
            offset: String(i),
            value: Buffer.from(JSON.stringify(v)),
          })),
        },
        resolveOffset,
        commitOffsetsIfNecessary,
        heartbeat: vi.fn(),
      },
      resolveOffset,
      commitOffsetsIfNecessary,
    };
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await startStatusConsumer(fakeKafka as any);
  });

  it("enqueues skipped receipts before resolving any offset", async () => {
    bulkUpdateStatuses.mockResolvedValue(["0"]);
    const order: string[] = [];
    enqueueStatusRetries.mockImplementation(async () => {
      order.push("enqueue");
    });
    const { payload, resolveOffset, commitOffsetsIfNecessary } = batchOf(
      { messageId: "wamid.A", status: "sent" },
      { messageId: "wamid.B", status: "sent" },
    );
    resolveOffset.mockImplementation(() => order.push("resolve"));

    await eachBatch(payload);

    expect(enqueueStatusRetries).toHaveBeenCalledTimes(1);
    const [retries] = enqueueStatusRetries.mock.calls[0];
    expect(retries.map((r: any) => r.messageId)).toEqual(["wamid.B"]);
    expect(order).toEqual(["enqueue", "resolve", "resolve"]);
    expect(commitOffsetsIfNecessary).toHaveBeenCalled();
  });

  it("resolves nothing when the retry hand-off fails, so Kafka redelivers", async () => {
    bulkUpdateStatuses.mockResolvedValue([]);
    enqueueStatusRetries.mockRejectedValue(new Error("redis down"));
    const { payload, resolveOffset, commitOffsetsIfNecessary } = batchOf({
      messageId: "wamid.A",
      status: "sent",
    });

    await expect(eachBatch(payload)).rejects.toThrow("redis down");
    expect(resolveOffset).not.toHaveBeenCalled();
    expect(commitOffsetsIfNecessary).not.toHaveBeenCalled();
  });

  it("resolves nothing when the dead-letter publish fails", async () => {
    bulkUpdateStatuses.mockResolvedValue([]);
    enqueueStatusRetries.mockResolvedValue(undefined);
    producerSend.mockRejectedValue(new Error("kafka down"));
    const { payload, resolveOffset } = batchOf({
      messageId: "wamid.A",
      status: "sent",
      retryCount: MAX_RETRIES,
    });

    await expect(eachBatch(payload)).rejects.toThrow("kafka down");
    expect(producerSend).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "status-events-dlq" }),
    );
    expect(resolveOffset).not.toHaveBeenCalled();
  });
});
