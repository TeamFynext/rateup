import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * Zapier trigger deliveries from before they moved onto `integrationTriggerQueue`.
 * Only drained now (`zapierTrigger.processor.ts`); remove both once it is empty.
 */
export const zapierTriggerQueue = new Queue("zapierTriggerQueue", { connection });

/** Sync work for the first-party integrations (Zoho, Shopify, …). */
export const integrationTriggerQueue = new Queue("integrationTriggerQueue", { connection });
