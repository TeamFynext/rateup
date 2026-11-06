import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * One delayed job per scheduled retry, firing at its exact `scheduledFor`.
 *
 * This replaced a five-minute cron that swept for due rows. The sweep was fine while
 * the smallest offset was 45 minutes, but it caps firing granularity at the tick
 * interval, so a retry due at :26 waited until :30.
 *
 * The `CampaignSend` row is still the source of truth for *what* is scheduled —
 * the UI reads it, and cancelling is still an UPDATE. This queue only decides
 * *when* the row is looked at. That split is what keeps a lost or duplicated job
 * harmless: firing re-reads the row and claims it conditionally, so a job whose
 * row was cancelled does nothing, and two jobs for one row produce one send.
 *
 * The job id is derived from the send id, so BullMQ itself collapses a
 * double-arm into a single delayed job.
 */
export const campaignRetryFire = new Queue("campaignRetryFire", { connection });

// No ':' anywhere in here — BullMQ rejects a custom job id containing one,
// since that is the separator in its own Redis keys.
export const campaignRetryJobId = (campaignSendId: string) => `campaignSend-${campaignSendId}`;

/**
 * Schedule `campaignSendId` to fire at `scheduledFor`.
 *
 * A time already past becomes a zero delay rather than an error: reconciliation
 * re-arms rows that came due while the worker was down, and those must run now.
 */
export async function armCampaignRetry(campaignSendId: string, scheduledFor: Date): Promise<void> {
  await campaignRetryFire.add(
    "fire",
    { campaignSendId },
    {
      jobId: campaignRetryJobId(campaignSendId),
      delay: Math.max(0, scheduledFor.getTime() - Date.now()),
      removeOnComplete: true,
      // Kept briefly so a firing that threw is visible in the queue rather than
      // only in the logs.
      removeOnFail: 100,
    },
  );
}

/**
 * Drop the pending job for `campaignSendId`, best-effort.
 *
 * Tidiness, not correctness: a cancelled send whose job survives is a no-op when
 * it fires, because the claim requires the row to still be SCHEDULED. So a
 * failure here — most often the job being active already — is not worth
 * propagating to the caller that just cancelled the send.
 */
export async function disarmCampaignRetry(campaignSendId: string): Promise<void> {
  await campaignRetryFire.remove(campaignRetryJobId(campaignSendId)).catch(() => {});
}
