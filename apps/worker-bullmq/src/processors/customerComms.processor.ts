import { Worker } from "bullmq";
import baseRedis from "@rateup/api/utils/redisConnection.js";
import { log } from "@rateup/api/utils/logger.js";
import {
  PermanentSendError,
  deliverCustomerMessage,
  fireBroadcast,
  markCustomerMessageFailed,
} from "@rateup/api/modules/platform/customerComms/send.js";
import type { CustomerCommsJob } from "@rateup/api/workers/bullmq/queues/customerComms.queue.js";

const workerConnection = baseRedis.duplicate();

// Queue-wide across replicas: stays under the SES account's send rate (14/s in ap-south-1).
const SENDS_PER_SECOND = 10;

export const customerCommsWorker = new Worker<CustomerCommsJob>(
  "customerComms",
  async (job) => {
    if (job.data.kind === "broadcast") {
      await fireBroadcast(job.data.broadcastId);
      return;
    }
    const { messageId } = job.data;
    try {
      await deliverCustomerMessage(messageId);
    } catch (err) {
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (err instanceof PermanentSendError || lastAttempt) {
        await markCustomerMessageFailed(messageId, err);
        if (err instanceof PermanentSendError) return;
      }
      throw err;
    }
  },
  {
    connection: workerConnection,
    concurrency: 5,
    limiter: { max: SENDS_PER_SECOND, duration: 1_000 },
  },
);

customerCommsWorker.on("failed", (job, err) => {
  log.error({ err, jobId: job?.id, attempts: job?.attemptsMade }, "Customer comms job failed");
});

customerCommsWorker.on("error", (err) => {
  log.error("Customer comms worker error: %s", err);
});
