import { Worker, Job } from "bullmq";
import { log } from "../../../utils/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import {
  handleWebhook,
  processShopifySurveySchedule,
  ShopifyWebhookJobData,
} from "../../../modules/integrations/shopify/shopify.service.js";
import { ShopifyEvents } from "../../../types/enums.js";
import {
  toCommerceLoyaltyJob,
  type ShopifyLoyaltyJobData,
} from "../../../modules/integrations/shopify/shopifyLoyalty.service.js";
import {
  commerceAwardKey,
  processCommerceOrderLoyalty,
  type CommerceLoyaltyJobData,
} from "../../../modules/integrations/commerce/loyalty.js";
import { getCommerceProvider } from "../../../modules/integrations/commerce/registry.js";
import { LoyaltyError } from "../../../modules/loyalty/loyalty.errors.js";

const workerConnection = baseRedis.duplicate();

export const shopifyWebhookWorker = new Worker(
  "webhookQueue",
  async (job: Job<ShopifyWebhookJobData>) => {
    const webhook = job.data;
    log.debug(`Processing webhook job ${job.id} for topic: ${webhook.topic}`);

    try {
      await handleWebhook(webhook);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ error }, `Error processing webhook ${webhook.webhookId}: ${message}`);
      // Rethrown so the job is recorded as failed. Note this queue sets no `attempts`, so
      // BullMQ will not retry it — and it should not: re-running the whole webhook would
      // re-send the customer's WhatsApp message. Loyalty, which is safe to retry, has its
      // own queue below.
      throw error;
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
  log.debug(`Webhook job ${job.id} completed successfully`);
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

const workerConnectionSurvey = baseRedis.duplicate();

export const shopifySurveyWorker = new Worker(
  "shopifySurveyQueue",
  async (job: Job<SurveyJobData>) => {
    const surveyData = job.data;
    log.debug(`Processing survey job ${job.id} for event: ${surveyData.event}`);

    try {
      await processShopifySurveySchedule(surveyData);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error({ error }, `Error processing survey schedule ${surveyData.scheduleId}: ${message}`);
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
  log.debug(`Survey job ${job.id} completed successfully`);
});

shopifySurveyWorker.on("failed", (job, err) => {
  log.error(`Survey job ${job?.id} failed: ${err.message}`);
});

shopifySurveyWorker.on("error", (err) => {
  log.error(`Survey worker error: ${err.message}`);
});

log.info("Shopify survey worker initialized");

const workerConnectionLoyalty = baseRedis.duplicate();

/**
 * A loyalty job in the commerce layer's shape. Jobs queued before the commerce
 * layer carry Shopify's `{ shop, topic }` instead; one of those can still be
 * retrying at the moment of a deploy, so both are read.
 */
function asCommerceJob(
  data: CommerceLoyaltyJobData | ShopifyLoyaltyJobData,
): CommerceLoyaltyJobData {
  return "provider" in data ? data : toCommerceLoyaltyJob(data);
}

/**
 * Loyalty points for an order, separate from the webhook job so it can retry on its own.
 *
 * Retrying the outer webhook would re-send the customer's WhatsApp template every time;
 * retrying this only re-attempts the points, and the idempotency key means a retry after a
 * partial success collapses onto the award that already landed.
 */
export const shopifyLoyaltyWorker = new Worker(
  "shopifyLoyaltyQueue",
  async (job: Job<CommerceLoyaltyJobData | ShopifyLoyaltyJobData>) => {
    const data = asCommerceJob(job.data);
    const provider = getCommerceProvider(data.provider);
    if (!provider) {
      log.error(
        { provider: data.provider, orderId: data.orderId },
        "Loyalty job for an unknown store",
      );
      return;
    }
    try {
      return await processCommerceOrderLoyalty(data, provider);
    } catch (error) {
      const context = {
        err: error,
        provider: data.provider,
        storeId: data.storeId,
        status: data.status,
        orderId: data.orderId,
        // The support handle: this is the value to look for in
        // LoyaltyTransaction.idempotencyKey to see whether points actually landed.
        key: commerceAwardKey(data.provider, data.storeId, data.orderId),
      };

      if (error instanceof LoyaltyError && !error.retryable) {
        // A settled fact — no such member, an amount that is not a number. Four more
        // attempts would reach the same conclusion four more times.
        log.error(context, `${provider.label} loyalty job ${job.id} cannot succeed: ${error.code}`);
        return;
      }

      log.error(context, `${provider.label} loyalty job ${job.id} failed; will retry`);
      throw error;
    }
  },
  {
    connection: workerConnectionLoyalty,
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
);

shopifyLoyaltyWorker.on("failed", (job, err) => {
  if (job?.data && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    const data = asCommerceJob(job.data);
    log.error(
      {
        provider: data.provider,
        storeId: data.storeId,
        orderId: data.orderId,
        key: commerceAwardKey(data.provider, data.storeId, data.orderId),
      },
      `Loyalty job ${job.id} exhausted its retries: ${err.message}`,
    );
  }
});

shopifyLoyaltyWorker.on("error", (err) => {
  log.error(`Shopify loyalty worker error: ${err.message}`);
});

log.info("Shopify loyalty worker initialized");
