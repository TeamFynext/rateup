// Ported from message-dispatcher/src/index.ts.
//
// Cancellation: walks the job ids recorded for a campaign and removes the ones
// that have not started yet (waiting/delayed/failed). Jobs already in flight are
// left to finish — a half-sent message cannot be recalled anyway.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { CampaignStatus } from "../../shared/types/enum.js";
import { BATCH_SIZE, updateCampaignStatus } from "../../shared/whatsapp/index.js";
import { waMessageQueue } from "../queues/whatsapp.queue.js";

const workerConnection = baseRedis.duplicate();

export const campaignDequeueWorker = new Worker(
  "waCampaignDequeue",
  async (job: Job) => {
    const { campaignId } = job.data;
    try {
      const jobIds = await baseRedis.smembers(`campaign:${campaignId}:jobs`);

      if (jobIds.length > 0) {
        for (let i = 0; i < jobIds.length; i += BATCH_SIZE) {
          const batch = jobIds.slice(i, i + BATCH_SIZE);
          log.trace(
            `Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(jobIds.length / BATCH_SIZE)}`,
          );
          await Promise.all(
            batch.map(async (jobId) => {
              const queued = await waMessageQueue.getJob(jobId);
              if (!queued) {
                // Job is gone from the queue but still in the Redis set — clean up.
                await baseRedis.srem(`campaign:${campaignId}:jobs`, jobId);
                return;
              }

              const state = await queued.getState();
              if (state === "waiting" || state === "delayed" || state === "failed") {
                await queued.remove();
                await baseRedis.srem(`campaign:${campaignId}:jobs`, jobId);
              }
            }),
          );
        }
      }
      log.trace(`Dequeueing ${jobIds.length} jobs for campaign ${campaignId}`);

      await updateCampaignStatus(campaignId, CampaignStatus.ACTIVE);
    } catch (error) {
      log.error("Error dequeuing campaign: %o", error);
      await updateCampaignStatus(campaignId, CampaignStatus.INACTIVE, null, true);
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
