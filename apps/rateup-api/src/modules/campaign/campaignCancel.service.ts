/**
 * Take a campaign's not-yet-sent messages back out of the queue.
 *
 * A scheduled campaign is not a row anyone re-reads at its due moment — it is
 * one delayed BullMQ job per participant, armed at fan-out time with everything
 * needed to send (phone, template, access token) already copied into the job's
 * payload. Nothing in `waMessageQueue` consults the `Campaign` row again, so
 * changing or removing that row does not stop a single message. Only walking the
 * jobs does.
 *
 * Lives here rather than in `processors/campaignDequeue.processor.ts` because
 * two callers need it: that worker, and `deleteCampaign` on the API's request
 * path — and nothing outside `src/workers/` may import from `processors/`.
 * Importing the queue *producer* is fine (see AGENTS.md).
 */
import baseRedis from "../../utils/redisConnection.js";
import { log } from "../../utils/logger.js";
import { waMessageQueue } from "../../workers/bullmq/queues/whatsapp.queue.js";
import { campaignSendJobsKey } from "../../workers/shared/campaignSendKeys.js";
import prisma from "../../utils/prisma.js";
import { LIVE_SEND_STATUSES } from "./campaignSend.service.js";

/**
 * How many job ids to inspect per round of `Promise.all`.
 *
 * Its own constant rather than the fan-out's `BATCH_SIZE`, which lives in
 * `workers/shared/whatsapp` and drags Prisma, the Meta send client and the
 * channel table in behind it — see the note atop `workers/shared/campaignSendKeys.ts`.
 */
const CANCEL_BATCH_SIZE = 5000;

export interface CampaignCancelResult {
  /** Delayed or waiting jobs actually taken out of the queue. */
  removed: number;
  /** Jobs already in flight. Their messages are on their way to Meta regardless. */
  locked: number;
  /** Live send sessions walked. */
  sends: number;
}

/**
 * Remove every pending message job belonging to `campaignId`'s live sends.
 *
 * Live sends come from the database rather than a guessed Redis key, because a
 * campaign can have several at once (a drip campaign runs one per stage) and
 * because a scheduled retry that has not been enqueued yet has no Redis set at
 * all.
 *
 * Jobs already running are left alone: a message Meta has accepted cannot be
 * recalled, and BullMQ refuses to remove a locked job anyway. That refusal
 * arrives as an exception, so it is caught per job — one message that started
 * sending mid-cancel must not abort the cancellation of the other ten thousand.
 */
export async function cancelPendingCampaignJobs(campaignId: string): Promise<CampaignCancelResult> {
  const liveSends = await prisma.campaignSend.findMany({
    where: { campaignId, status: { in: [...LIVE_SEND_STATUSES] } },
    select: { id: true },
  });

  let removed = 0;
  let locked = 0;

  for (const { id: campaignSendId } of liveSends) {
    const key = campaignSendJobsKey(campaignSendId);
    const jobIds = await baseRedis.smembers(key);

    for (let i = 0; i < jobIds.length; i += CANCEL_BATCH_SIZE) {
      const batch = jobIds.slice(i, i + CANCEL_BATCH_SIZE);
      const outcomes = await Promise.all(
        batch.map(async (jobId) => {
          try {
            const queued = await waMessageQueue.getJob(jobId);
            if (!queued) {
              // Gone from the queue but still in the set — clean up.
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
            // concurrency 250 a job routinely starts sending in between.
            log.warn({ err: error, jobId, campaignId }, "Left a locked campaign job alone");
            return "locked" as const;
          }
        }),
      );
      removed += outcomes.filter((outcome) => outcome === "removed").length;
      locked += outcomes.filter((outcome) => outcome === "locked").length;
    }
  }

  return { removed, locked, sends: liveSends.length };
}
