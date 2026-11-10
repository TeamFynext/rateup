import { describe, expect, it, vi } from "vite-plus/test";

// The module opens Redis, Postgres and a Meta client at import; the fan-out
// itself only needs a queue and a set, both faked below.
vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../../utils/db.js", () => ({ default: { connect: vi.fn() } }));
vi.mock("../ws.publisher.js", () => ({ publisher: { publish: vi.fn() }, WS_CHANNEL: "ws" }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: { duplicate: () => ({}) } }));
vi.mock("../../../modules/meta/shared/metaMessage.service.js", () => ({
  sendMetaMessage: vi.fn(),
  metaErrorMessage: vi.fn(),
}));

const { enqueueCampaignMessages, BATCH_SIZE } = await import("./index.js");
const { campaignSendJobsKey } = await import("../campaignSendKeys.js");

const SEND_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

/** A Redis stand-in holding just the sets the fan-out and settle path touch. */
function fakeRedis() {
  const sets = new Map<string, Set<string>>();
  const set = (key: string) => {
    if (!sets.has(key)) sets.set(key, new Set());
    return sets.get(key)!;
  };
  return {
    sets,
    sadd: vi.fn(async (key: string, ...ids: string[]) => ids.forEach((id) => set(key).add(id))),
    srem: (key: string, id: string) => Number(set(key).delete(id)),
  };
}

/**
 * A queue whose jobs finish the instant they are added, the way an undelayed
 * job can on a busy worker: each one runs the completion handler's SREM before
 * `addBulk` has even returned.
 */
function instantQueue(redis: ReturnType<typeof fakeRedis>) {
  const added: { data: Record<string, unknown>; opts: { jobId: string } }[] = [];
  const removedOnComplete: number[] = [];
  return {
    added,
    removedOnComplete,
    addBulk: vi.fn(async (batch: typeof added) => {
      added.push(...batch);
      for (const job of batch) {
        removedOnComplete.push(redis.srem(campaignSendJobsKey(SEND_ID), job.opts.jobId));
      }
    }),
  };
}

const participants = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    phone: `9199${i}`,
    phoneId: "phone-1",
    orgId: "org-1",
    accessToken: "encrypted-on-the-row",
    accessToken_iv: "iv",
  }));

describe("enqueueCampaignMessages", () => {
  it("drains the send's job set to zero even when every job finishes immediately", async () => {
    const redis = fakeRedis();
    const queue = instantQueue(redis);

    await enqueueCampaignMessages({
      queue: queue as never,
      participants: participants(BATCH_SIZE + 3),
      campaignId: "camp-1",
      campaignSendId: SEND_ID,
      connection: redis,
    });

    // Two chunks, each recorded before it was added.
    expect(queue.addBulk).toHaveBeenCalledTimes(2);
    expect(redis.sadd).toHaveBeenCalledTimes(2);
    expect(redis.sadd.mock.invocationCallOrder[0]).toBeLessThan(
      queue.addBulk.mock.invocationCallOrder[0],
    );
    expect(redis.sadd.mock.invocationCallOrder[1]).toBeLessThan(
      queue.addBulk.mock.invocationCallOrder[1],
    );
    // Every finished job found its id and removed it, so the last one closes the send.
    expect(queue.removedOnComplete.every((removed) => removed === 1)).toBe(true);
    expect(redis.sets.get(campaignSendJobsKey(SEND_ID))?.size).toBe(0);
  });

  it("puts no access token in job data", async () => {
    const redis = fakeRedis();
    const queue = instantQueue(redis);

    await enqueueCampaignMessages({
      queue: queue as never,
      participants: participants(2),
      campaignId: "camp-1",
      campaignSendId: SEND_ID,
      connection: redis,
    });

    for (const job of queue.added) {
      expect(job.data).not.toHaveProperty("accessToken");
      expect(job.data).not.toHaveProperty("accessToken_iv");
      expect(JSON.stringify(job.data)).not.toContain("encrypted-on-the-row");
      expect(job.data.phoneId).toBe("phone-1");
    }
  });
});
