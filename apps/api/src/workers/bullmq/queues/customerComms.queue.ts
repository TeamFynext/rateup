import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

export type CustomerCommsJob =
  | { kind: "send"; messageId: string }
  | { kind: "broadcast"; broadcastId: string };

/**
 * RateUp messaging its own customers (modules/platform/customerComms). `send` delivers one
 * CustomerMessage row; `broadcast` fires a scheduled Broadcast and fans out its sends.
 * The rows are the source of truth, and each job re-reads its row before acting.
 */
export const customerCommsQueue = new Queue<CustomerCommsJob>("customerComms", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 2_000 },
  },
});

// No ':' — BullMQ rejects custom job ids containing its own key separator.
export const sendJobId = (messageId: string) => `cm-${messageId}`;
export const broadcastJobId = (broadcastId: string) => `bc-${broadcastId}`;

export async function enqueueCustomerMessages(messageIds: string[]): Promise<void> {
  for (let i = 0; i < messageIds.length; i += 1_000) {
    await customerCommsQueue.addBulk(
      messageIds.slice(i, i + 1_000).map((messageId) => ({
        name: "send",
        data: { kind: "send" as const, messageId },
        opts: { jobId: sendJobId(messageId) },
      })),
    );
  }
}

export async function armBroadcast(broadcastId: string, at: Date): Promise<void> {
  await customerCommsQueue.add(
    "broadcast",
    { kind: "broadcast", broadcastId },
    {
      jobId: broadcastJobId(broadcastId),
      delay: Math.max(0, at.getTime() - Date.now()),
      attempts: 3,
    },
  );
}

/** Best-effort: a cancelled broadcast whose job survives is a no-op when it fires. */
export async function disarmBroadcast(broadcastId: string): Promise<void> {
  await customerCommsQueue.remove(broadcastJobId(broadcastId)).catch(() => undefined);
}
