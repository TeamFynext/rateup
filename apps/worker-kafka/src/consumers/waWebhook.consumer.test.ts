import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("@rateup/api/utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
const processWhatsappWebhook = vi.fn();
vi.mock("@rateup/api/modules/whatsapp/whatsappSurvey/wasurvey.webhook.js", () => ({
  processWhatsappWebhook,
}));
const addBulk = vi.fn();
vi.mock("@rateup/api/workers/bullmq/queues/waWebhookRetry.queue.js", async (importOriginal) => ({
  // The job id helper and options are pure; only the Queue (Redis) is replaced.
  ...(await importOriginal<object>()),
  waWebhookRetryQueue: { addBulk },
}));
vi.mock("@rateup/api/utils/redisConnection.js", () => ({ default: {} }));
vi.mock("bullmq", () => ({ Queue: class {} }));

const { isStatusOnly, startWaWebhookConsumer } = await import("./waWebhook.consumer.js");
const { MAX_RETRIES, retryDelayMs } = await import("./statusRetry.js");

type EachBatch = (payload: Record<string, unknown>) => Promise<void>;

function fakeKafka() {
  let eachBatch: EachBatch | undefined;
  const producer = {
    events: { DISCONNECT: "producer.disconnect" },
    on: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn().mockResolvedValue([]),
  };
  const consumer = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    run: vi.fn(async (options: { eachBatch: EachBatch }) => {
      eachBatch = options.eachBatch;
    }),
  };
  const kafka = { consumer: () => consumer, producer: () => producer };
  return { kafka, producer, consumer, eachBatch: () => eachBatch! };
}

const messageBody = (from: string, id: string) =>
  JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba",
        changes: [{ field: "messages", value: { messages: [{ from, id, type: "text" }] } }],
      },
    ],
  });

const statusBody = (id: string) =>
  JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba",
        changes: [{ field: "messages", value: { statuses: [{ id, status: "sent" }] } }],
      },
    ],
  });

function record(offset: number, key: string, value: string, headers: Record<string, string> = {}) {
  return {
    offset: String(offset),
    key: Buffer.from(key),
    value: Buffer.from(value),
    headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, Buffer.from(v)])),
  };
}

/** Runs one batch; `outcome` is the eachBatch promise, settled. */
async function runBatch(messages: ReturnType<typeof record>[]) {
  const fake = fakeKafka();
  await startWaWebhookConsumer(fake.kafka as never);
  const order: string[] = [];
  const resolveOffset = vi.fn((offset: string) => order.push(`resolve ${offset}`));
  const commitOffsetsIfNecessary = vi.fn();
  addBulk.mockImplementation(async () => {
    order.push("enqueue");
  });
  const outcome = await fake
    .eachBatch()({
      batch: { topic: "wa-webhooks", partition: 3, messages },
      resolveOffset,
      commitOffsetsIfNecessary,
      heartbeat: vi.fn(),
    })
    .then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ ok: false as const, error }),
    );
  return { ...fake, resolveOffset, commitOffsetsIfNecessary, order, outcome };
}

beforeEach(() => {
  vi.clearAllMocks();
  processWhatsappWebhook.mockResolvedValue(undefined);
});

describe("waWebhook consumer", () => {
  test("processes every record and moves the whole batch forward", async () => {
    const { resolveOffset, commitOffsetsIfNecessary, producer } = await runBatch([
      record(1, "911", messageBody("911", "m1")),
      record(2, "922", messageBody("922", "m2")),
      record(3, "phone", statusBody("s1")),
    ]);

    expect(processWhatsappWebhook).toHaveBeenCalledTimes(3);
    expect(resolveOffset.mock.calls.map(([offset]) => offset)).toEqual(["1", "2", "3"]);
    expect(commitOffsetsIfNecessary).toHaveBeenCalledOnce();
    expect(producer.send).not.toHaveBeenCalled();
    expect(addBulk).not.toHaveBeenCalled();
  });

  test("runs one customer's records one at a time, in order", async () => {
    const seen: string[] = [];
    processWhatsappWebhook.mockImplementation(async (body) => {
      const id = body.entry[0].changes[0].value.messages[0].id;
      seen.push(`start ${id}`);
      await new Promise((resolve) => setTimeout(resolve, id === "m1" ? 20 : 0));
      seen.push(`end ${id}`);
    });

    await runBatch([
      record(1, "911", messageBody("911", "m1")),
      record(2, "911", messageBody("911", "m2")),
    ]);

    expect(seen).toEqual(["start m1", "end m1", "start m2", "end m2"]);
  });

  test("enqueues a durable, delayed retry before any offset is resolved", async () => {
    processWhatsappWebhook.mockRejectedValueOnce(new Error("db down"));
    const value = messageBody("911", "m1");

    const { order, outcome } = await runBatch([
      record(7, "911", value, { "retry-count": "2", "received-at": "t0" }),
      record(8, "922", messageBody("922", "m2")),
    ]);

    expect(outcome.ok).toBe(true);
    expect(order).toEqual(["enqueue", "resolve 7", "resolve 8"]);
    const [jobs] = addBulk.mock.calls[0]!;
    expect(jobs).toHaveLength(1);
    expect(jobs[0].data).toEqual({
      topic: "wa-webhooks",
      key: "911",
      value,
      headers: { "received-at": "t0", error: "db down", "retry-count": "3" },
      retryCount: 3,
    });
    expect(jobs[0].opts).toMatchObject({
      jobId: "wawh-wa-webhooks-3-7-3",
      delay: retryDelayMs(2),
      attempts: expect.any(Number),
      backoff: { type: "exponential", delay: expect.any(Number) },
    });
    expect(jobs[0].opts.jobId).not.toContain(":");
  });

  test("resolves nothing and throws when the retry cannot be enqueued", async () => {
    processWhatsappWebhook.mockRejectedValueOnce(new Error("db down"));
    const kafka = fakeKafka();
    await startWaWebhookConsumer(kafka.kafka as never);
    addBulk.mockRejectedValueOnce(new Error("redis down"));
    const resolveOffset = vi.fn();
    const commitOffsetsIfNecessary = vi.fn();

    await expect(
      kafka.eachBatch()({
        batch: {
          topic: "wa-webhooks",
          partition: 0,
          messages: [record(1, "911", messageBody("911", "m1")), record(2, "922", statusBody("s"))],
        },
        resolveOffset,
        commitOffsetsIfNecessary,
        heartbeat: vi.fn(),
      }),
    ).rejects.toThrow("redis down");

    expect(resolveOffset).not.toHaveBeenCalled();
    expect(commitOffsetsIfNecessary).not.toHaveBeenCalled();
  });

  test("resolves nothing and throws when a dead-letter cannot be sent", async () => {
    const kafka = fakeKafka();
    await startWaWebhookConsumer(kafka.kafka as never);
    kafka.producer.send.mockRejectedValueOnce(new Error("broker down"));
    const resolveOffset = vi.fn();

    await expect(
      kafka.eachBatch()({
        batch: { topic: "wa-webhooks", partition: 0, messages: [record(1, "911", "not json")] },
        resolveOffset,
        commitOffsetsIfNecessary: vi.fn(),
        heartbeat: vi.fn(),
      }),
    ).rejects.toThrow("broker down");

    expect(resolveOffset).not.toHaveBeenCalled();
  });

  test("dead-letters a record that has used up its retries, instead of retrying it", async () => {
    processWhatsappWebhook.mockRejectedValueOnce(new Error("still broken"));
    const value = messageBody("911", "m1");

    const { producer, resolveOffset } = await runBatch([
      record(1, "911", value, { "retry-count": String(MAX_RETRIES) }),
    ]);

    expect(addBulk).not.toHaveBeenCalled();
    expect(producer.send).toHaveBeenCalledOnce();
    const [{ topic, messages }] = producer.send.mock.calls[0]!;
    expect(topic).toBe("wa-webhooks-dlq");
    expect(messages[0].key).toBe("911");
    expect(messages[0].value).toBe(value);
    expect(messages[0].headers.error).toBe("still broken");
    expect(resolveOffset).toHaveBeenCalledWith("1");
  });

  test("dead-letters a record that is not JSON, without processing it", async () => {
    const { producer } = await runBatch([record(1, "911", "not json")]);

    expect(processWhatsappWebhook).not.toHaveBeenCalled();
    expect(addBulk).not.toHaveBeenCalled();
    expect(producer.send.mock.calls[0]![0].topic).toBe("wa-webhooks-dlq");
  });
});

describe("isStatusOnly", () => {
  test("is true only when every change carries statuses and nothing else", () => {
    expect(isStatusOnly(JSON.parse(statusBody("s1")))).toBe(true);
    expect(isStatusOnly(JSON.parse(messageBody("911", "m1")))).toBe(false);
    expect(isStatusOnly({ object: "x", entry: [] } as never)).toBe(false);
  });
});
