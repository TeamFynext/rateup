import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/** Inbound Shopify webhook payloads. */
export const webhookQueue = new Queue("webhookQueue", { connection });

/** Outbound webhook deliveries to customer-configured endpoints. */
export const outgoingWebhookQueue = new Queue("outgoingWebhookQueue", { connection });

/** Post-purchase Shopify survey sends. */
export const shopifySurveyQueue = new Queue("shopifySurveyQueue", { connection });
