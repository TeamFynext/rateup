// Ported from message-dispatcher/src/index.ts.
//
// Cancellation: walks the job ids recorded for each of a campaign's live send
// sessions and removes the ones that have not started yet
// (waiting/delayed/failed). Jobs already in flight are left to finish — a
// half-sent message cannot be recalled anyway.
//
// Live sends are read from the database rather than guessed from a Redis key,
// because a campaign can have several (a drip campaign runs one per stage) and
// because a scheduled retry that has not been enqueued yet has no Redis set at
// all — cancelling it is purely a status change.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { CampaignStatus } from "../../shared/types/enum.js";
import {
  BATCH_SIZE,
  campaignSendJobsKey,
  updateCampaignStatus,
} from "../../shared/whatsapp/index.js";
import { waMessageQueue } from "../queues/whatsapp.queue.js";
import prisma from "../../../utils/prisma.js";
import {
  cancelCampaignSends,
  LIVE_SEND_STATUSES,
} from "../../../modules/campaign/campaignSend.service.js";

const workerConnection = baseRedis.duplicate();

export const campaignDequeueWorker = new Worker(
  "waCampaignDequeue",
  async (job: Job) => {
    const { campaignId } = job.data;
    try {
      const liveSends = await prisma.campaignSend.findMany({
        where: { campaignId, status: { in: [...LIVE_SEND_STATUSES] } },
        select: { id: true },
      });

      let removedCount = 0;
      let lockedCount = 0;
      for (const { id: campaignSendId } of liveSends) {
        const key = campaignSendJobsKey(campaignSendId);
        const jobIds = await baseRedis.smembers(key);

        for (let i = 0; i < jobIds.length; i += BATCH_SIZE) {
          const batch = jobIds.slice(i, i + BATCH_SIZE);
          log.trace(
            `Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(jobIds.length / BATCH_SIZE)}`,
          );
          const outcomes = await Promise.all(
            batch.map(async (jobId) => {
              try {
                const queued = await waMessageQueue.getJob(jobId);
                if (!queued) {
                  // Job is gone from the queue but still in the Redis set — clean up.
                  await baseRedis.srem(key, jobId);
                  return "gone" as const;
                }

                const state = await queued.getState();
                if (state === "waiting" || state === "delayed" || state === "failed") {
                  await queued.remove();
                  await baseRedis.srem(key, jobId);
                  return "removed" as const;
                }
                return "running" as const;
              } catch (error) {
                // The state check and the removal are two round trips, and at
                // concurrency 250 a job routinely starts sending in between —
                // BullMQ then refuses to remove it ("locked by another worker")
                // and throws. That message is already on its way to Meta and
                // cannot be recalled, which is the same answer as the `running`
                // branch above; the only thing that made it different was that
                // it arrived as an exception, aborting the whole dequeue and
                // marking a campaign FAILED for doing exactly what was asked.
                log.warn({ err: error, jobId, campaignId }, "Left a locked campaign job alone");
                return "locked" as const;
              }
            }),
          );
          removedCount += outcomes.filter((outcome) => outcome === "removed").length;
          lockedCount += outcomes.filter((outcome) => outcome === "locked").length;
        }
      }

      // Closes scheduled retries too, which never had a Redis set to walk.
      await cancelCampaignSends(campaignId, { note: "Cancelled by the campaign owner." });

      log.info(
        { campaignId, removedCount, lockedCount, sends: liveSends.length },
        "Dequeued a campaign's pending messages",
      );

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
