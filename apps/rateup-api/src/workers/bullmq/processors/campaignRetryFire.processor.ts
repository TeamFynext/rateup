// Fires one scheduled CampaignSend when its delayed job comes due.
//
// Deliberately thin: the decision of whether the row may fire at all — still
// SCHEDULED, actually due — lives in the claim inside `fireCampaignSendById`,
// so this processor never has to reason about a stale or duplicated job. It
// only reports what happened.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { fireCampaignSendById } from "../../../modules/campaign/campaignRetry.service.js";

const workerConnection = baseRedis.duplicate();

export const campaignRetryFireWorker = new Worker(
  "campaignRetryFire",
  async (job: Job<{ campaignSendId: string }>) => {
    const { campaignSendId } = job.data;
    const result = await fireCampaignSendById(campaignSendId);
    log.info({ campaignSendId, result }, "Scheduled campaign send reached its fire time");
    return result;
  },
  { connection: workerConnection },
);

campaignRetryFireWorker.on("failed", (job, err) => {
  log.error({ err, campaignSendId: job?.data?.campaignSendId }, "campaignRetryFire job failed");
});
