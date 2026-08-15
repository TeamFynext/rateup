import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/** Outbound Zapier trigger deliveries. */
export const zapierTriggerQueue = new Queue("zapierTriggerQueue", { connection });

/** Sync work for the first-party integrations (Zoho, Shopify, …). */
export const integrationTriggerQueue = new Queue("integrationTriggerQueue", { connection });
