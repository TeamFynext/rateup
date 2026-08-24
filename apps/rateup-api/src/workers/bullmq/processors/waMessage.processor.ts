// Ported from message-dispatcher/src/index.ts.
//
// The hot path of the whole system: one job per campaign recipient, at
// concurrency 250. `processParticipant` renders the template for that contact and
// sends it.
//
// Completion is tracked in a Redis set rather than by watching the queue, because
// the enqueue processor records every job id it fans out into
// `campaign:<id>:jobs`. When the last id is removed the campaign is finished and
// the owning team gets notified.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { processParticipant } from "../../shared/modules/messageDispatch/messageDispatch.service.js";
import { renderCampaignCompletedEmailBodies } from "../../../utils/email/react/templates.js";
import { getUsersByTeamId } from "../../shared/team/index.js";
import { getCampaignById } from "../../shared/whatsapp/index.js";
import { notificationQueue } from "../queues/notification.queue.js";

const workerConnection = baseRedis.duplicate();

export const waMessageWorker = new Worker(
  "waMessageQueue",
  async (job: Job) => {
    if (!job?.data) {
      return;
    }
    try {
      await processParticipant(job.data);
      log.info("Queue processing completed successfully");
    } catch (error) {
      log.error("Error processing job: %o", error);
    }
  },
  {
    connection: workerConnection,
    removeOnFail: {
      count: 1,
    },
    concurrency: 250,
  },
);

waMessageWorker.on("completed", async (job) => {
  if (!job?.data?.campaignId || !job.id) return;

  try {
    const key = `campaign:${job.data.campaignId}:jobs`;
    // Remove the finished job, then check whether any are left.
    await baseRedis.srem(key, job.id);
    const remaining = await baseRedis.scard(key);
    if (remaining !== 0) return;

    if (job?.data?.teamId) {
      const users = await getUsersByTeamId(job.data.teamId);
      const campaign = await getCampaignById(job.data.campaignId);
      const emailForClient = await renderCampaignCompletedEmailBodies({
        campaignName: campaign.name,
        campaignId: campaign.id,
      });
      for (const user of users) {
        await notificationQueue.add("notification", {
          emailData: {
            to: user.email,
            subject: `RateUp - ${campaign.name} Completed`,
            html: emailForClient.html,
            text: emailForClient.text,
          },
          systemNotificationData: {
            userId: user.id,
            orgId: job?.data?.orgId,
            source: "campaign",
            subSource: "campaign-completed",
            data: {
              campaignId: campaign.id,
              campaignName: campaign.name,
            },
          },
        });
      }
    }
    log.info(`Campaign ${job.data.campaignId} finished`);
  } catch (error) {
    log.error(`Error removing job ${job.id} from Redis set: %o`, error);
  }
});

waMessageWorker.on("error", (err) => {
  log.error("waMessage worker error: %s", err);
});

log.info("WhatsApp message worker initialized");
