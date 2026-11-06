import { Worker, Job } from "bullmq";
import baseRedis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import {
  deliverOutgoingWebhook,
  type OutgoingWebhookJobData,
} from "../../../modules/webhook/webhook.service.js";

export const outgoingWebhookWorker = new Worker(
  "outgoingWebhookQueue",
  async (job: Job<OutgoingWebhookJobData>) => {
    await deliverOutgoingWebhook(job.data, job.id ?? `${job.name}-${job.timestamp}`);
  },
  {
    connection: baseRedis.duplicate(),
    concurrency: 10,
    removeOnComplete: {
      count: 1,
    },
  },
)
  .on("failed", (job, err) => {
    log.error("Outgoing webhook job %s failed: %s", job?.id, err.message);
  })
  .on("error", (err) => {
    log.error("Outgoing webhook worker error: %s", err.message);
  });

log.info("Outgoing webhook worker initialized");
