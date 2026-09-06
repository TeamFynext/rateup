import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";
import { campaignSendJobsKey } from "../../shared/campaignSendKeys.js";

/** Fan-out producer: expands a campaign into one waMessageQueue job per participant. */
export const waCampaignEnqueue = new Queue("waCampaignEnqueue", { connection });

/** Cancels a campaign by removing its still-pending waMessageQueue jobs. */
export const waCampaignDequeue = new Queue("waCampaignDequeue", { connection });

/**
 * Live job count for one send session. The enqueue processor tracks its fan-out
 * in a Redis set (`campaignSend:<sendId>:jobs`) so completion can be detected
 * per attempt without scanning the queue itself.
 */
export const getCampaignSendCount = (campaignSendId: string) => {
  return connection.scard(campaignSendJobsKey(campaignSendId));
};

/**
 * Live job count for a campaign, summed across every send session that still has
 * jobs outstanding. A campaign can have more than one — a drip campaign runs a
 * send per stage — so this is a sum rather than a single SCARD.
 */
export const getCampaignCount = async (campaignSendIds: string[]) => {
  if (!campaignSendIds.length) return 0;
  const counts = await Promise.all(campaignSendIds.map(getCampaignSendCount));
  return counts.reduce((total, count) => total + count, 0);
};
