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
  { id: "hourlyJobs", pattern: "0 * * * *" },
  { id: "zohoRefresh", pattern: "*/45 * * * *", tz: "Etc/UTC" },
  { id: "midnightStatsReset", pattern: "30 0 * * *" },
  { id: "loyaltyBirthdayCheck", pattern: "0 0 * * *" }, // Every day at 12:00 AM
  { id: "loyaltyPointsExpiration", pattern: "0 1 * * *" }, // Every day at 1:00 AM
  { id: "loyaltyInactivityCheck", pattern: "0 2 * * *" }, // Every day at 2:00 AM
  { id: "loyaltyPointsExpiryAlerts", pattern: "0 3 * * *" }, // Every day at 3:00 AM
  { id: "inboxAutomation", pattern: "0 * * * *" }, // Every hour
  // TODO: re-enable once the report is working again.
  // { id: "weeklyInboxReport", pattern: "0 9 * * 0" }, // Sundays at 9:00 AM
] as const satisfies ReadonlyArray<{ id: string; pattern: string; tz?: string }>;

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
        opts: { removeOnComplete: { count: 100 }, removeOnFail: { count: 1_000 } },
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
