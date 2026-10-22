import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * A `wa-webhooks` record that failed in the kafka service, waiting out its retry
 * delay in Redis rather than in that process's memory.
 *
 * The consumer enqueues the retry *before* it lets the Kafka offset go, so a
 * failed delivery is always held by one of the two: the topic until the job is
 * accepted, then the delayed job. A crash in between replays the batch, and the
 * deterministic job id collapses the second enqueue onto the first.
 *
 * When the delay is up, `waWebhookRetry.processor.ts` (bullmq service) publishes
 * the record back to `wa-webhooks` under its original key, so it is processed by
 * the partition that owns that conversation, like any other record.
 *
 * Producer only — safe to import from the kafka service and the API.
 */
export const waWebhookRetryQueue = new Queue("waWebhookRetry", { connection });

export interface WaWebhookRetryJobData {
  /** The topic to publish back to (`wa-webhooks`). */
  topic: string;
  key: string | null;
  /** The record value exactly as consumed — the raw delivery. */
  value: string;
  /** The record's headers, with `retry-count` already set to `retryCount`. */
  headers: Record<string, string>;
  /** The attempt this publish starts: 1 for the first retry. */
  retryCount: number;
}

/**
 * Per source record and round. No ':' — BullMQ rejects a custom job id
 * containing one, since that is the separator in its own Redis keys.
 */
export const waWebhookRetryJobId = (
  topic: string,
  partition: number,
  offset: string,
  round: number,
) => `wawh-${topic}-${partition}-${offset}-${round}`;

/** The publish itself is retried too: the broker being down is why many of these exist. */
export const WA_WEBHOOK_RETRY_JOB_OPTIONS = {
  attempts: 8,
  backoff: { type: "exponential" as const, delay: 2_000 },
  // Kept for an hour so a batch redelivered after its retry already went out still
  // collapses onto this id instead of publishing the record a second time.
  removeOnComplete: { age: 3_600 },
  removeOnFail: { count: 5_000 },
};
