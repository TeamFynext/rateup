// Re-publishes a skipped WhatsApp receipt to `status-events` once its delay is
// up. See queues/statusRetry.queue.ts for why the receipt goes back through the
// topic rather than being applied here.
//
// Uses the shared producer, which the bullmq entrypoint connects at startup.
import { Job, Worker } from "bullmq";

import { log } from "@rateup/api/workers/shared/logger.js";
import baseRedis from "@rateup/api/utils/redisConnection.js";
import { producer } from "@rateup/api/plugins/kafka.js";
import { STATUS_EVENTS_TOPIC } from "@rateup/api/utils/kafka.js";
import {
  STATUS_RETRY_QUEUE,
  type StatusRetryJobData,
} from "@rateup/api/workers/bullmq/queues/statusRetry.queue.js";

const workerConnection = baseRedis.duplicate();

export async function republishStatusRetry(job: Job<StatusRetryJobData>): Promise<void> {
  const { key, value } = job.data;
  await producer.send({ topic: STATUS_EVENTS_TOPIC, messages: [{ key, value }] });
}

export const statusRetryWorker = new Worker(STATUS_RETRY_QUEUE, republishStatusRetry, {
  connection: workerConnection,
  // Each job is one small produce request; a campaign's worth of early `sent`s
  // can arrive at once.
  concurrency: 50,
});

statusRetryWorker.on("failed", (job, err) => {
  const exhausted = job && job.attemptsMade >= (job.opts.attempts ?? 1);
  log.error(
    { err, jobId: job?.id, attemptsMade: job?.attemptsMade },
    exhausted
      ? "Status retry could not be re-published after all attempts; kept in the failed set"
      : "Status retry re-publish failed; BullMQ will try again",
  );
});
