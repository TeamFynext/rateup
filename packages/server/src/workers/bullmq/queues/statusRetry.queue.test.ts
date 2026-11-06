import { describe, expect, it, vi } from "vitest";

const addBulk = vi.fn();
vi.mock("../../../utils/redisConnection.js", () => ({ default: {} }));
vi.mock("bullmq", () => ({
  Queue: class {
    addBulk = addBulk;
  },
}));

const { enqueueStatusRetries, statusRetryJob, statusRetryJobId } =
  await import("./statusRetry.queue.js");

const retry = {
  key: "wamid.A",
  value: '{"retryCount":3}',
  messageId: "wamid.A",
  status: "sent",
  retryCount: 3,
  delayMs: 2000,
};

describe("status retry jobs", () => {
  it("delays the job by the receipt's backoff", () => {
    const job = statusRetryJob(retry);
    expect(job.opts.delay).toBe(2000);
    expect(job.data).toEqual({ key: "wamid.A", value: '{"retryCount":3}' });
  });

  it("uses an id fixed by message, status and round", () => {
    expect(statusRetryJob(retry).opts.jobId).toBe("status-wamid.A-sent-3");
    expect(statusRetryJobId("wamid.A", "sent", 3)).toBe(statusRetryJobId("wamid.A", "sent", 3));
    expect(statusRetryJobId("wamid.A", "sent", 4)).not.toBe(statusRetryJobId("wamid.A", "sent", 3));
    expect(statusRetryJobId("wamid.A", "read", 3)).not.toBe(statusRetryJobId("wamid.A", "sent", 3));
  });

  it("never puts ':' in an id, which BullMQ rejects", () => {
    expect(statusRetryJobId("wamid:A", "sent", 1)).not.toContain(":");
  });

  it("adds every retry in one round-trip, and none for an empty list", async () => {
    await enqueueStatusRetries([]);
    expect(addBulk).not.toHaveBeenCalled();

    await enqueueStatusRetries([retry, { ...retry, status: "read" }]);
    expect(addBulk).toHaveBeenCalledTimes(1);
    expect(addBulk.mock.calls[0][0]).toHaveLength(2);
  });
});
