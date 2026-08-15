import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/** Fan-out producer: expands a campaign into one waMessageQueue job per participant. */
export const waCampaignEnqueue = new Queue("waCampaignEnqueue", { connection });

/** Cancels a campaign by removing its still-pending waMessageQueue jobs. */
export const waCampaignDequeue = new Queue("waCampaignDequeue", { connection });

/**
 * Live job count for a campaign. The enqueue processor tracks its fan-out in a
 * Redis set (`campaign:<id>:jobs`) so completion can be detected without scanning
 * the queue itself.
 */
export const getCampaignCount = (campaignId: string) => {
  return connection.scard(`campaign:${campaignId}:jobs`);
};
