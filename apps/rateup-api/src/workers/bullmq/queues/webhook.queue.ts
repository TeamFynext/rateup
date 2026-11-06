import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/** Inbound Shopify webhook payloads. */
export const webhookQueue = new Queue("webhookQueue", { connection });

/** Outbound webhook deliveries to customer-configured endpoints. */
export const outgoingWebhookQueue = new Queue("outgoingWebhookQueue", { connection });

/** Post-purchase Shopify survey sends. */
export const shopifySurveyQueue = new Queue("shopifySurveyQueue", { connection });

/**
 * Loyalty points for a Shopify order, on its own queue rather than inline in the webhook
 * job.
 *
 * Two reasons, and both matter. The job id is keyed on the *order*, so Shopify's ordinary
 * redelivery of `orders/paid` — which arrives with a fresh webhook id, and so sails past
 * the webhook queue's dedupe — collapses onto one job. And a loyalty failure can be retried
 * without re-running the webhook's other half, which would send the customer a second
 * WhatsApp message every time.
 *
 * The job id is a cache with bounded retention, not a guarantee; the durable one is the
 * unique index on `LoyaltyTransaction.idempotencyKey`.
 */
export const shopifyLoyaltyQueue = new Queue("shopifyLoyaltyQueue", { connection });
