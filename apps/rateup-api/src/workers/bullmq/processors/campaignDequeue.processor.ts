// Ported from message-dispatcher/src/index.ts.
//
// Cancellation, as asked for by pausing a campaign. The walk that actually
// empties the queue is `cancelPendingCampaignJobs`, shared with `deleteCampaign`
// — deleting a campaign has to take its pending messages out of the queue too,
// and a delete cannot wait on a job of its own to do it. What is left here is
// the part specific to a pause: closing the send sessions and settling the
// campaign's own status afterwards.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { CampaignStatus } from "../../shared/types/enum.js";
import { updateCampaignStatus } from "../../shared/whatsapp/index.js";
import { cancelPendingCampaignJobs } from "../../../modules/campaign/campaignCancel.service.js";
import { cancelCampaignSends } from "../../../modules/campaign/campaignSend.service.js";

const workerConnection = baseRedis.duplicate();

export const campaignDequeueWorker = new Worker(
  "waCampaignDequeue",
  async (job: Job) => {
    const { campaignId } = job.data;
    try {
      const cancelled = await cancelPendingCampaignJobs(campaignId);

      // Closes scheduled retries too, which never had a Redis set to walk.
      await cancelCampaignSends(campaignId, { note: "Cancelled by the campaign owner." });

      log.info({ campaignId, ...cancelled }, "Dequeued a campaign's pending messages");

      // INACTIVE, not ACTIVE. Leaving a just-cancelled campaign ACTIVE made the
      // list show it as running with nothing left in the queue, and let the drip
      // cron pick it back up on its next tick.
      await updateCampaignStatus(campaignId, CampaignStatus.INACTIVE);
    } catch (error) {
      log.error({ err: error, campaignId }, "Error dequeuing campaign");
      // The stop itself failed, so the campaign is not cleanly paused — say so
      // rather than reporting the pause the owner asked for but did not get.
      await updateCampaignStatus(
        campaignId,
        CampaignStatus.FAILED,
        null,
        true,
        "The campaign could not be stopped cleanly. Check it before sending again.",
      );
    }
  },
  {
    connection: workerConnection,
    removeOnComplete: {
      count: 1,
    },
  },
);

campaignDequeueWorker.on("error", (err) => {
  log.error("Campaign dequeue worker error: %s", err);
});

log.info("Campaign dequeue worker initialized");
