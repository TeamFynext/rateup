import { Queue, type JobsOptions } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * Delayed re-publish of WhatsApp receipts the status consumer could not apply yet.
 *
 * A receipt is skipped when its message row is not there yet (Meta's `sent`
 * regularly beats the send path's insert). The consumer used to hold those in
 * `setTimeout`s and re-publish them when the timer fired — after it had already
 * committed the batch's offsets, so a crash or deploy in between lost the
 * receipt for good. Now the consumer adds one delayed job per skipped receipt
 * here and only then resolves the offsets: once `add` returns the receipt is in
 * Redis, and a crash on either side leaves it there.
 *
 * The job does not apply the status itself. It puts the receipt back on
 * `status-events`, keyed by message id, so it is applied by the consumer that
 * owns that message's partition. Applying it here would make a second writer
 * for the same `WaMessage.stats` row, racing the consumer's read-modify-write
 * and double-counting campaign totals. The consumer still counts the rounds
 * (`retryCount` in the payload) and sends a receipt past MAX_RETRIES to
 * `status-events-dlq`, as before.
 *
 * Produced by the `kafka` service, processed by the `bullmq` service
 * (`processors/statusRetry.processor.ts`).
 */
export const STATUS_RETRY_QUEUE = "statusRetry";

export const statusRetryQueue = new Queue(STATUS_RETRY_QUEUE, { connection });

export interface StatusRetryJobData {
  /** Kafka message key — the wamid, so the receipt lands on its message's partition. */
  key: string;
  /** The receipt as it goes back on the topic, `retryCount` already incremented. */
  value: string;
}

export interface StatusRetry extends StatusRetryJobData {
  messageId: string;
  status: string;
  /** Rounds this receipt will have been through once re-published. */
  retryCount: number;
  delayMs: number;
}

/**
 * Deterministic per receipt *and* per round. The same receipt redelivered by
 * Kafka (a batch that crashed before its commit) maps to the same id and BullMQ
 * keeps one job; the next round gets a new id, so it is never swallowed by the
 * previous round's job still finishing.
 *
 * BullMQ rejects a custom id containing ':' (its key separator), so any is
 * replaced.
 */
export function statusRetryJobId(messageId: string, status: string, retryCount: number): string {
  return `status-${messageId}-${status}-${retryCount}`.replaceAll(":", "_");
}

export function statusRetryJob(retry: StatusRetry): {
  name: string;
  data: StatusRetryJobData;
  opts: JobsOptions;
} {
  return {
    name: "republish",
    data: { key: retry.key, value: retry.value },
    opts: {
      jobId: statusRetryJobId(retry.messageId, retry.status, retry.retryCount),
      delay: Math.max(0, retry.delayMs),
      // These attempts cover the re-publish itself (Kafka unreachable), not the
      // receipt's rounds, which the consumer counts.
      attempts: 10,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: true,
      // A receipt that could not be re-published at all is kept for a week, so it
      // can be found and retried from the queue rather than only from the logs.
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  };
}

/** Durably schedule `retries`; resolves once every job is in Redis. */
export async function enqueueStatusRetries(retries: StatusRetry[]): Promise<void> {
  if (!retries.length) return;
  await statusRetryQueue.addBulk(retries.map(statusRetryJob));
}
