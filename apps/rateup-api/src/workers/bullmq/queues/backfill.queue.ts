// Producer half of the conversation backfill. The control surface that drives it
// over HTTP lives in modules/update/update.backfill.control.ts; the consumer is
// processors/backfillConversation.processor.ts.
import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

export const BACKFILL_QUEUE_NAME = "backfillConversationQueue";

export const BACKFILL_JOB_OPTS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2_000 },
  removeOnComplete: true,
  removeOnFail: 1_000,
};

// Redis keys for observable progress (survive restarts alongside the jobs).
export const BACKFILL_KEYS = {
  status: "backfill:conv:status", // idle | running | scanned | stopped
  startedAt: "backfill:conv:startedAt",
  finishedAt: "backfill:conv:finishedAt",
  scanned: "backfill:conv:scanned",
  created: "backfill:conv:created",
  linked: "backfill:conv:linked",
  assignees: "backfill:conv:assignees",
  skipped: "backfill:conv:skipped", // raced with live traffic → left alone
} as const;

export const backfillConversationQueue = new Queue(BACKFILL_QUEUE_NAME, { connection });

export interface ScanData {
  cursor: string | null;
}
export interface ProcessData {
  contactIds: string[];
}
