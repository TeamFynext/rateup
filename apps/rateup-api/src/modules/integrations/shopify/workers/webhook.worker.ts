import { Worker, Job } from "bullmq";
import { log } from "../../../../utils/logger.js";
import IORedis from "ioredis";
import "dotenv/config";
import baseRedis from "../../../../utils/redisConnection.js";
import {
  handleWebhook,
  processShopifySurveySchedule,
} from "../shopify.service.js";
import { ShopifyEvents } from "../../../../types/enums.js";

const redisURL = new URL(process.env.REDIS_URL as string);

const workerConnection = new IORedis.default({
  family: 0,
  host: redisURL.hostname,
  port: Number.parseInt(redisURL.port),
  username: redisURL.username,
  password: redisURL.password,
  maxRetriesPerRequest: null,
});

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
    connection: workerConnection,
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

interface SurveyJobData {
  orgId: string;
  integrationId: string;
  event: ShopifyEvents;
  scheduleId: string;
}

const workerConnectionSurvey = new IORedis.default({
  family: 0,
  host: redisURL.hostname,
  port: Number.parseInt(redisURL.port),
  username: redisURL.username,
  password: redisURL.password,
  maxRetriesPerRequest: null,
});

export const shopifySurveyWorker = new Worker(
  "shopifySurveyQueue",
  async (job: Job<SurveyJobData>) => {
    const surveyData = job.data;
    log.info(`Processing survey job ${job.id} for event: ${surveyData.event}`);

    try {
      await processShopifySurveySchedule(surveyData);
    } catch (error) {
      log.error(
        { error },
        `Error processing survey schedule ${surveyData.scheduleId}: ${error.message}`,
      );
      throw error; // Trigger a BullMQ retry if failure is unexpected
    }
  },
  {
    connection: workerConnectionSurvey,
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
);

shopifySurveyWorker.on("completed", (job) => {
  log.info(`Survey job ${job.id} completed successfully`);
});

shopifySurveyWorker.on("failed", (job, err) => {
  log.error(`Survey job ${job?.id} failed: ${err.message}`);
});

shopifySurveyWorker.on("error", (err) => {
  log.error(`Survey worker error: ${err.message}`);
});

log.info("Shopify survey worker initialized");
