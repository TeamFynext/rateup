import { Job, Worker } from "bullmq";

import baseRedis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { BackfillJob, NormaliseMessagesJob } from "../queues/backfill.queue.js";
import { normaliseContactIdentifiers, normaliseMessageBatch } from "./normaliseSourceIdentifier.js";

const workerConnection = baseRedis.duplicate();

/**
 * The `backfill` queue's consumer. The work itself lives in
 * `normaliseSourceIdentifier.ts` — importing this module attaches a Worker, so
 * nothing that is not the worker service can import it, tests included.
 */
export const backfillWorker = new Worker(
  "backfill",
  async (job: Job) => {
    if (job.name === BackfillJob.NormaliseMessageIdentifiers) {
      return normaliseMessageBatch(job as Job<NormaliseMessagesJob>);
    }
    if (job.name === BackfillJob.NormaliseContactIdentifiers) {
      return normaliseContactIdentifiers();
    }
    log.warn({ name: job.name }, "backfill worker: unknown job");
  },
  {
    connection: workerConnection,
    // See `normaliseMessageBatch`: the bottleneck is index maintenance, and
    // parallel batches would contend for it rather than divide it.
    concurrency: 1,
    removeOnComplete: { count: 50 },
  },
);

backfillWorker.on("error", (err) => {
  log.error({ err }, "Backfill worker error");
});
