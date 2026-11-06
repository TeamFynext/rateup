import { Job, Worker } from "bullmq";

import { producer } from "@rateup/api/plugins/kafka.js";
import { log } from "@rateup/api/utils/logger.js";
import baseRedis from "@rateup/api/utils/redisConnection.js";
import type { WaWebhookRetryJobData } from "@rateup/api/workers/bullmq/queues/waWebhookRetry.queue.js";

const workerConnection = baseRedis.duplicate();

/**
 * Publish one held `wa-webhooks` retry back to the topic, under its original key
 * so it lands on the partition that owns its conversation. A failed publish
 * throws, and the job's own attempts/backoff retry it
 * (`WA_WEBHOOK_RETRY_JOB_OPTIONS`); the record is lost only once those run out,
 * and then it stays visible in the failed set.
 */
export async function republishWaWebhookRetry(data: WaWebhookRetryJobData) {
  await producer.send({
    topic: data.topic,
    acks: -1,
    messages: [{ key: data.key, value: data.value, headers: data.headers }],
  });
}

export const waWebhookRetryWorker = new Worker(
  "waWebhookRetry",
  async (job: Job<WaWebhookRetryJobData>) => {
    await republishWaWebhookRetry(job.data);
  },
  {
    connection: workerConnection,
    concurrency: 10,
  },
);

waWebhookRetryWorker.on("failed", (job, err) => {
  const exhausted = job && job.attemptsMade >= (job.opts.attempts ?? 1);
  log.error(
    { jobId: job?.id, key: job?.data?.key, retryCount: job?.data?.retryCount, err },
    exhausted
      ? "wa-webhook retry could not be re-published and has no attempts left; it is in the failed set"
      : "wa-webhook retry re-publish failed; will retry",
  );
});

waWebhookRetryWorker.on("error", (err) => {
  log.error(`wa-webhook retry worker error: ${err.message}`);
});
