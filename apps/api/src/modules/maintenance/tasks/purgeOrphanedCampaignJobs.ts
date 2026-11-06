import prisma from "../../../utils/prisma.js";
import baseRedis from "../../../utils/redisConnection.js";
import { campaignRetryFire } from "../../../workers/bullmq/queues/campaignRetry.queue.js";
import { waMessageQueue } from "../../../workers/bullmq/queues/whatsapp.queue.js";
import { campaignSendJobsKey } from "../../../workers/shared/campaignSendKeys.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * How many jobs to remove per round.
 *
 * Removals are issued together so ioredis pipelines them, which is what makes a
 * five-thousand-message campaign finish in seconds rather than minutes. Bounded
 * rather than unbounded so a very large campaign does not build one enormous
 * pipeline and hold every job object live at once.
 */
const REMOVE_BATCH_SIZE = 500;

/**
 * Removes queued campaign messages whose campaign no longer exists.
 *
 * `deleteCampaign` used to be a bare row delete. A scheduled campaign is not a row
 * anyone re-reads at its due moment — it is one delayed job per participant, each
 * carrying its own copy of the phone number, template and access token — so deleting
 * the campaign removed the record and left every message armed. They fired on time and
 * Meta delivered them: real messages from a campaign that no longer existed, which then
 * failed their own bookkeeping writes because `campaignParticipantId` pointed at a
 * cascade-deleted row.
 *
 * Delete cancels its queue now. This is for the ones stranded before it did, which
 * nothing else will ever clear: no row references them, so they are reachable only by
 * reading the queue itself.
 *
 * A campaign is judged orphaned solely by its row being gone. A campaign that still
 * exists is never touched however odd its state looks — pausing a live campaign is the
 * dequeue path's job, not this one.
 */
export async function purgeOrphanedCampaignJobs({ apply, log }: TaskContext): Promise<TaskOutcome> {
  // Only states that have not sent yet. An `active` job is already on its way to Meta
  // and cannot be recalled, so listing it would promise something this cannot deliver.
  const jobs = await waMessageQueue.getJobs(["delayed", "waiting"], 0, -1);
  log(`${jobs.length} campaign message job(s) not yet sent`);

  // The campaign id lives inside each job's payload and is indexed nowhere, so the only
  // way to ask "whose is this?" is to read every job and group them here.
  const byCampaign = new Map<string, typeof jobs>();
  for (const job of jobs) {
    const campaignId = job?.data?.campaignId;
    if (!campaignId) continue;
    const bucket = byCampaign.get(campaignId) ?? [];
    bucket.push(job);
    byCampaign.set(campaignId, bucket);
  }

  const campaignIds = [...byCampaign.keys()];
  const alive = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true },
  });
  const aliveIds = new Set(alive.map((campaign) => campaign.id));
  log(`${campaignIds.length} campaign(s) hold them; ${aliveIds.size} still exist`);

  const orphanedCampaigns = campaignIds.filter((id) => !aliveIds.has(id));
  const orphanedJobs = orphanedCampaigns.flatMap((id) => byCampaign.get(id) ?? []);

  for (const campaignId of orphanedCampaigns) {
    const campaignJobs = byCampaign.get(campaignId) ?? [];
    const dueAt = campaignJobs
      .map((job) => job.timestamp + (job.opts.delay ?? 0))
      .sort((first, second) => first - second);
    log(
      `deleted campaign ${campaignId}: ${campaignJobs.length} message(s), ` +
        `firing ${new Date(dueAt[0]).toISOString()} — ${new Date(dueAt.at(-1)!).toISOString()}`,
    );
  }

  // A scheduled retry has a delayed job of its own and no queued messages, so the walk
  // above cannot see it. Its row is normally the guard — a firing job re-reads it and
  // claims nothing once it is CANCELLED — but a deleted campaign leaves no row to read.
  const retryJobs = await campaignRetryFire.getJobs(["delayed", "waiting"], 0, -1);
  const sendIds = retryJobs
    .map((job) => job.data?.campaignSendId)
    .filter((id): id is string => Boolean(id));
  const liveSends = sendIds.length
    ? await prisma.campaignSend.findMany({
        where: { id: { in: sendIds } },
        select: { id: true },
      })
    : [];
  const liveSendIds = new Set(liveSends.map((send) => send.id));
  const orphanedRetries = retryJobs.filter((job) => !liveSendIds.has(job.data?.campaignSendId));
  log(`${retryJobs.length} armed retry job(s); ${orphanedRetries.length} point at a deleted send`);

  const details = {
    scannedJobs: jobs.length,
    orphanedCampaigns: orphanedCampaigns.length,
    orphanedJobs: orphanedJobs.length,
    orphanedRetryJobs: orphanedRetries.length,
    campaignIds: orphanedCampaigns,
  };

  if (!orphanedJobs.length && !orphanedRetries.length) {
    return { summary: "No queued messages belong to a deleted campaign.", details };
  }

  if (!apply) {
    return {
      summary:
        `Would remove ${orphanedJobs.length} message(s) from ${orphanedCampaigns.length} ` +
        `deleted campaign(s), and ${orphanedRetries.length} orphaned retry job(s).`,
      details,
    };
  }

  let removed = 0;
  let failed = 0;

  // A batch at a time, not a job at a time. Removing one job is two round trips to
  // Redis, and awaiting each in turn made a campaign of five thousand messages ten
  // thousand sequential round trips — minutes of wall clock on a hosted Redis, long
  // enough that the request carrying this task timed out partway and left the
  // operator re-running it a couple of hundred jobs at a time. Issued together they
  // pipeline, and the same five thousand finish in a handful of round trips.
  for (let index = 0; index < orphanedJobs.length; index += REMOVE_BATCH_SIZE) {
    const batch = orphanedJobs.slice(index, index + REMOVE_BATCH_SIZE);

    const outcomes = await Promise.all(
      batch.map(async (job) => {
        try {
          await job.remove();
          return job;
        } catch (error) {
          // A job that started sending between the read and the removal is locked,
          // and BullMQ throws rather than removing it. That message is already gone;
          // one of them must not abort the removal of the other ten thousand.
          log(`could not remove ${job.id}: ${error instanceof Error ? error.message : "unknown"}`);
          return null;
        }
      }),
    );

    const gone = outcomes.filter((job) => job !== null);
    removed += gone.length;
    failed += batch.length - gone.length;

    // The job set is keyed by send, and a campaign can have several. Members are
    // grouped by key so each send takes one SREM per batch rather than one per
    // message, and only the ids actually removed are dropped — anything left behind
    // stays in the set, where a later run will find it.
    const membersByKey = new Map<string, string[]>();
    for (const job of gone) {
      if (!job.data?.campaignSendId || !job.id) continue;
      const key = campaignSendJobsKey(job.data.campaignSendId);
      const members = membersByKey.get(key) ?? [];
      members.push(job.id);
      membersByKey.set(key, members);
    }
    if (membersByKey.size) {
      const pipeline = baseRedis.pipeline();
      for (const [key, members] of membersByKey) pipeline.srem(key, ...members);
      await pipeline.exec();
    }

    log(`removed ${removed}/${orphanedJobs.length} message job(s)`);
  }

  const retryOutcomes = await Promise.all(
    orphanedRetries.map(async (job) => {
      try {
        await job.remove();
        return true;
      } catch (error) {
        log(
          `could not remove retry ${job.id}: ${error instanceof Error ? error.message : "unknown"}`,
        );
        return false;
      }
    }),
  );
  const retriesRemoved = retryOutcomes.filter(Boolean).length;
  failed += retryOutcomes.length - retriesRemoved;

  log(`removed ${removed} message job(s) and ${retriesRemoved} retry job(s)`);

  return {
    summary:
      `Removed ${removed} queued message(s) from ${orphanedCampaigns.length} deleted ` +
      `campaign(s) and ${retriesRemoved} orphaned retry job(s)` +
      (failed ? `; ${failed} were already sending and were left alone.` : "."),
    details: { ...details, removed, retriesRemoved, failed },
  };
}
