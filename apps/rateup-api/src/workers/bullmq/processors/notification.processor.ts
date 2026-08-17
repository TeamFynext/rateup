import { Worker } from "bullmq";
import baseRedis from "../../../utils/redisConnection.js";
import { processNotification } from "../../../modules/notification/notification.service.js";
import { log } from "../../../utils/logger.js";

const workerConnection = baseRedis.duplicate();

export const notificationWorker = new Worker(
  "notificationQueue",
  async (job) => {
    if (!job?.data) {
      log.warn("no data in notification");
      return;
    }
    // Errors propagate so BullMQ retries per the queue's `attempts`. This used to be caught
    // and logged, which marked a failed send as a completed job.
    await processNotification(job);
    log.info("Notification queue processing completed successfully");
  },
  {
    connection: workerConnection,
    concurrency: 5,
    removeOnComplete: {
      count: 1,
    },
  },
);

notificationWorker.on("error", (err) => {
  log.error("Notification worker error: %s", err);
});

notificationWorker.on("failed", (job, err) => {
  log.error({ err, jobId: job?.id, attempts: job?.attemptsMade }, "Notification job failed");
});

/**
 * Fast lane for email a user is actively waiting on (password reset, verification, invites).
 * Same process as the bulk worker — separate queue and separate concurrency pool, so a
 * backed-up weekly-report run can never delay a reset link. See
 * `queues/notification.queue.ts` for why this is a queue rather than a job priority.
 */
const transactionalConnection = baseRedis.duplicate();

export const transactionalEmailWorker = new Worker(
  "transactionalEmailQueue",
  async (job) => {
    if (!job?.data) {
      log.warn("no data in transactional email job");
      return;
    }
    await processNotification(job);
    log.info({ jobId: job.id }, "Transactional email sent");
  },
  {
    connection: transactionalConnection,
    concurrency: 20,
    removeOnComplete: {
      count: 100,
    },
  },
);

transactionalEmailWorker.on("error", (err) => {
  log.error("Transactional email worker error: %s", err);
});

transactionalEmailWorker.on("failed", (job, err) => {
  // A user is waiting on this one — surface every attempt, not just the last.
  log.error(
    { err, jobId: job?.id, to: job?.data?.emailData?.to, attempts: job?.attemptsMade },
    "Transactional email job failed",
  );
});

log.info("Notification system initialized");
