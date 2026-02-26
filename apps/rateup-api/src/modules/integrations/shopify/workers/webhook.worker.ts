import { Worker, Job } from "bullmq";
import { log } from "../../../../utils/logger.js";
import baseRedis from "../../../../utils/redisConnection.js";
import { handleWebhook } from "../shopify.service.js";

interface WebhookJobData {
  topic: string;
  webhookId: string;
  body: any;
  shop: string;
}

export const shopifyWebhookWorker = new Worker(
  "webhookQueue",
  async (job: Job<WebhookJobData>) => {
    const webhook = job.data;
    log.info(`Processing webhook job ${job.id} for topic: ${webhook.topic}`);

    try {
      await handleWebhook(webhook);
    } catch (error) {
      log.error(
        { error },
        `Error processing webhook ${webhook.webhookId}: ${error.message}`,
      );
      throw error; // Trigger a BullMQ retry
    }
  },
  {
    connection: baseRedis,
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
);

shopifyWebhookWorker.on("completed", (job) => {
  log.info(`Webhook job ${job.id} completed successfully`);
});

shopifyWebhookWorker.on("failed", (job, err) => {
  log.error(`Webhook job ${job?.id} failed: ${err.message}`);
});

shopifyWebhookWorker.on("error", (err) => {
  log.error(`Webhook worker error: ${err.message}`);
});

log.info("Shopify webhook worker initialized");
