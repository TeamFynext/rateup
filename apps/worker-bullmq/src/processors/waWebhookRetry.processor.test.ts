import { describe, expect, test, vi } from "vitest";

vi.mock("@rateup/api/utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@rateup/api/utils/redisConnection.js", () => ({ default: { duplicate: () => ({}) } }));
vi.mock("bullmq", () => ({
  Worker: class {
    on() {}
  },
}));
const send = vi.fn();
vi.mock("@rateup/api/plugins/kafka.js", () => ({ producer: { send } }));

const { republishWaWebhookRetry } = await import("./waWebhookRetry.processor.js");

describe("republishWaWebhookRetry", () => {
  test("publishes the record back to its topic under its original key", async () => {
    send.mockResolvedValue([]);

    await republishWaWebhookRetry({
      topic: "wa-webhooks",
      key: "911",
      value: "{}",
      headers: { "retry-count": "1" },
      retryCount: 1,
    });

    expect(send).toHaveBeenCalledWith({
      topic: "wa-webhooks",
      acks: -1,
      messages: [{ key: "911", value: "{}", headers: { "retry-count": "1" } }],
    });
  });

  test("throws when the publish fails, so the job's attempts retry it", async () => {
    send.mockRejectedValue(new Error("broker down"));

    await expect(
      republishWaWebhookRetry({ topic: "t", key: null, value: "{}", headers: {}, retryCount: 1 }),
    ).rejects.toThrow("broker down");
  });
});
