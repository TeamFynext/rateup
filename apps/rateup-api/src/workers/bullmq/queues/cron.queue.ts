import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * Everything that runs on a wall-clock schedule.
 *
 * These used to be in-process `cron` timers, which is why the bullmq service was
 * pinned to one replica: nothing stopped a second replica from firing the same
 * tick again. BullMQ keeps the schedule in Redis and hands each occurrence to
 * exactly one worker, so the service scales like any other consumer.
 *
 * One behavioural difference from the timers: an occurrence missed while the
 * service is down is *not* skipped. The delayed job is already in Redis, so it
 * runs late — once — as soon as a worker is back. A three-day outage produces one
 * catch-up run per job, not one per missed tick.
 *
 * Definitions only, deliberately: no handler functions and no service imports, so
 * this module stays safe for the API to import. Handlers live in
 * processors/scheduledJobs.processor.ts and are keyed by `id`.
 */
export const SCHEDULED_JOBS = [
  { id: "publishSurveys", pattern: "0/15 * * * *" },
  { id: "dripCampaigns", pattern: "*/4 * * * *", tz: "Etc/UTC" },
  // Closes campaigns that drained cleanly. Firing due retries is NOT here: each
  // scheduled retry carries its own delayed job (queues/campaignRetry.queue.ts)
  // and goes off at its exact time, which a tick this coarse could not do. What
  // is left is the other half of the old pairing — a campaign drains before its
  // delivery webhooks land, so recognising a finished send still needs a sweep.
  { id: "campaignSettle", pattern: "*/5 * * * *", tz: "Etc/UTC" },
  // Stored Shopify checkouts hold customer contact details; expire and delete old ones.
  { id: "shopifyCheckoutCleanup", pattern: "30 3 * * *", tz: "Etc/UTC" },
  // Subscribes connected shops to webhook topics added after they installed.
  { id: "shopifyWebhookSync", pattern: "15 4 * * *", tz: "Etc/UTC" },
  // Every provider's `refreshCredential` — Zoho's token and webhook channels today.
  // Was `zohoRefresh`; the stale scheduler is removed by `syncJobSchedulers`.
  { id: "integrationCredentialRefresh", pattern: "*/45 * * * *", tz: "Etc/UTC" },
  // Cycles legacy non-expiring Shopify tokens (rejected from 2027-01-01) and keeps
  // idle shops' 90-day refresh tokens from lapsing; in-use tokens renew on demand.
  { id: "shopifyTokenRenewal", pattern: "40 2 * * *", tz: "Etc/UTC" },
  { id: "midnightStatsReset", pattern: "30 0 * * *" },
  // Expired partner-API replay records. They hold nothing but a stored response and are
  // only useful for 24 hours; the durable idempotency guarantee is the ledger's own key.
  { id: "externalIdempotencySweep", pattern: "15 3 * * *" },
  // One hourly sweep for every scheduled loyalty reminder, replacing four daily jobs that
  // pinned no timezone and so fired at this container's midnight. Each occasion asks
  // whether the hour its programme chose has struck in the programme's own zone, which a
  // daily job could not express at all. Pinned to UTC so the wake-up times are the same on
  // every deployment; the per-programme zone is applied inside.
  { id: "loyaltyReminderSweep", pattern: "0 * * * *", tz: "Etc/UTC" },
  // Programmes that judge tiers on a trailing window: a member whose spend has lapsed is
  // only ever re-checked when they buy, so this sweep is what moves the quiet ones.
  { id: "loyaltyTierReevaluation", pattern: "30 2 * * *" }, // Every day at 2:30 AM
  { id: "inboxAutomation", pattern: "0 * * * *" }, // Every hour
  // Hourly, at :20. A dropped payment webhook leaves a paying customer's expiresAt in
  // the past, which the 4:00 AM downgrade below would then act on — so this has to get
  // there first, and the :20 run at 03:20 does. Hourly (rather than daily) is what keeps
  // a stuck conversation-pack purchase from sitting unpaid-looking until tomorrow.
  { id: "reconcileMissedPayments", pattern: "20 * * * *" },
  // Warnings first, then the downgrade — a customer hears "expires tomorrow" and
  // "has expired" before anything is taken away.
  { id: "subscriptionExpiryAlerts", pattern: "30 3 * * *" }, // Every day at 3:30 AM
  { id: "downgradeExpiredSubscriptions", pattern: "0 4 * * *" }, // Every day at 4:00 AM
  // Staff console sessions that ended over 30 days ago.
  { id: "staffSessionPurge", pattern: "45 3 * * *" },
  // TODO: re-enable once the report is working again.
  // { id: "weeklyInboxReport", pattern: "0 9 * * 0" }, // Sundays at 9:00 AM
] as const satisfies ReadonlyArray<{
  id: string;
  pattern: string;
  tz?: string;
}>;

/**
 * The union of scheduled job ids. The handler map in the processor is typed
 * `Record<ScheduledJobId, …>`, so adding an entry above without a handler is a
 * compile error rather than a job that silently does nothing at 3am.
 */
export type ScheduledJobId = (typeof SCHEDULED_JOBS)[number]["id"];

export const scheduledJobsQueue = new Queue("scheduledJobs", { connection });

/**
 * Brings the schedulers in Redis in line with `SCHEDULED_JOBS`.
 *
 * `upsertJobScheduler` is idempotent — it updates the pattern in place rather
 * than stacking duplicates — so this is safe to call on every boot and from every
 * replica. The reconciliation pass afterwards is what stops a renamed or deleted
 * job from ticking forever out of Redis, long after its code is gone.
 */
export async function syncJobSchedulers() {
  for (const job of SCHEDULED_JOBS) {
    await scheduledJobsQueue.upsertJobScheduler(
      job.id,
      { pattern: job.pattern, ...("tz" in job ? { tz: job.tz } : {}) },
      // The job template names every produced job after its scheduler — the
      // scheduler assigns its own job ids, so the name is the only handle the
      // processor can dispatch on. Retention is set here rather than left to the
      // worker defaults because job-level options win over them.
      {
        name: job.id,
        opts: {
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 1_000 },
        },
      },
    );
  }

  const known = new Set<string>(SCHEDULED_JOBS.map((job) => job.id));
  const existing = await scheduledJobsQueue.getJobSchedulers();
  const stale = existing.filter((scheduler) => scheduler.key && !known.has(scheduler.key));
  for (const scheduler of stale) {
    await scheduledJobsQueue.removeJobScheduler(scheduler.key);
  }

  return { registered: SCHEDULED_JOBS.length, removed: stale.length };
}
