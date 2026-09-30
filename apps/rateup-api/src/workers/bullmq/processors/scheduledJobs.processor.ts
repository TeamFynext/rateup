// Consumer for the wall-clock schedule defined in queues/cron.queue.ts.
//
// These handler bodies were in-process `cron` timers until the schedule moved
// into Redis; they are otherwise unchanged. Each isolates its own failures with
// `safeRun`, so one broken action inside a tick does not cancel the others or
// fail (and therefore retry) the whole job.
import { Job, Worker } from "bullmq";

import { log } from "../../../utils/logger.js";
import { sweepExpiredIdempotencyRecords } from "../../../external/v1/idempotency.js";
import baseRedis from "../../../utils/redisConnection.js";
import { resetAnnualCounts, resetMonthlyCounts } from "../../../modules/stats/stats.service.js";
import {
  endSurveyCronAction,
  publishSurveyCronAction,
} from "../../../modules/survey/survey.service.js";
import { sendCampaignCronAction } from "../../../modules/campaign/campaign.service.js";
import { syncShopifyWebhooks } from "../../../modules/integrations/shopify/shopify.service.js";
import { cleanupShopifyCheckouts } from "../../../modules/integrations/shopify/shopify.checkouts.service.js";
import { renewShopifyTokensCronAction } from "../../../modules/integrations/shopify/shopify.session.js";
import { refreshIntegrationCredentials } from "../../../modules/integrations/shared/credentialRefresh.js";
import {
  processDripCampaigns,
  sendSchedulesWaMessages,
} from "../../../modules/whatsapp/wa_message_scheduler.js";
import { runInboxAutomationCron } from "../../../modules/whatsapp/inbox/automation/inboxautomation.service.js";
import { runLoyaltyReminderSweep } from "../../../modules/loyalty/settings/reminderSweep.service.js";
import { getWeeklyConversationReport } from "../../shared/bullmqCronJobs/sendMail/weeklyMail.js";
import { downgradeExpiredSubscriptions } from "../../../modules/subscription/subscription.service.js";
import { sweepMissedPayments } from "../../../modules/payment/payment.service.js";
import { subscriptionExpiryAlert } from "../../../utils/email/payments/subscriptionExpiryAlert.js";
import type { ScheduledJobId } from "../queues/cron.queue.js";
import { reevaluateRollingTiers } from "../../../modules/loyalty/tiers/tierReevaluation.service.js";
import { settleSentCampaigns } from "../../../modules/campaign/campaignSettle.service.js";
import { purgeStaffSessions } from "../../../modules/staff/staff.session.js";

const workerConnection = baseRedis.duplicate();

function safeRun(name: string, fn: () => Promise<unknown>) {
  return fn().catch((err) => {
    log.error(err, `Cron job "${name}" failed`);
  });
}

/**
 * Typed against `ScheduledJobId`, so a schedule added without a handler here (or
 * a handler left behind after its schedule is deleted) fails the build.
 */
const HANDLERS: Record<ScheduledJobId, () => Promise<void>> = {
  publishSurveys: async () => {
    log.info("Running every 15min JOB --> Survey Publish Updations");
    await Promise.all([
      safeRun("publishSurveyCronAction", publishSurveyCronAction),
      safeRun("endSurveyCronAction", endSurveyCronAction),
      safeRun("sendCampaignCronAction", sendCampaignCronAction),
      safeRun("sendSchedulesWaMessages", sendSchedulesWaMessages),
    ]);
  },

  dripCampaigns: async () => {
    log.info("Running every 4min JOB --> Drip Campaign Processing");
    await safeRun("processDripCampaigns", processDripCampaigns);
  },

  campaignSettle: async () => {
    log.info("Running every 5min JOB --> Campaign settle processing");
    // Retries fire from their own delayed jobs now, so all this tick does is
    // close campaigns whose sends turned out not to need a retry at all.
    await safeRun("settleSentCampaigns", settleSentCampaigns);
  },

  shopifyCheckoutCleanup: async () => {
    await safeRun("cleanupShopifyCheckouts", cleanupShopifyCheckouts);
  },

  shopifyWebhookSync: async () => {
    await safeRun("syncShopifyWebhooks", syncShopifyWebhooks);
  },

  shopifyTokenRenewal: async () => {
    log.info("Running daily JOB --> Shopify offline token renewal");
    await safeRun("renewShopifyTokensCronAction", renewShopifyTokensCronAction);
  },

  integrationCredentialRefresh: async () => {
    log.info("Running every 45min JOB --> Integration credential refresh");
    await safeRun("refreshIntegrationCredentials", refreshIntegrationCredentials);
  },

  midnightStatsReset: async () => {
    log.info("Running Every Day 12.30 AM --> Stats Reset");
    await safeRun("resetMonthlyCounts", resetMonthlyCounts);
    await safeRun("resetAnnualCounts", resetAnnualCounts);
  },

  externalIdempotencySweep: async () => {
    log.info("Running daily JOB --> External API idempotency record sweep");
    await safeRun("sweepExpiredIdempotencyRecords", async () => {
      const removed = await sweepExpiredIdempotencyRecords();
      log.info({ removed }, "Swept expired external idempotency records");
    });
  },

  loyaltyReminderSweep: async () => {
    // Hourly. Every occasion inside decides whether its programme's chosen hour has
    // struck in that programme's own timezone, so most ticks send nothing.
    log.info("Running hourly JOB --> Loyalty reminder sweep");
    await safeRun("runLoyaltyReminderSweep", runLoyaltyReminderSweep);
  },

  loyaltyTierReevaluation: async () => {
    log.info("Running Daily at 2:30 AM --> Loyalty rolling-window tier re-evaluation");
    await safeRun("reevaluateRollingTiers", reevaluateRollingTiers);
  },

  reconcileMissedPayments: async () => {
    log.info("Running hourly JOB --> Reconciling payments the webhooks may have missed");
    await safeRun("sweepMissedPayments", sweepMissedPayments);
  },

  subscriptionExpiryAlerts: async () => {
    log.info("Running Daily at 3:30 AM --> Subscription expiry reminders");
    await safeRun("subscriptionExpiryAlert", subscriptionExpiryAlert);
  },

  downgradeExpiredSubscriptions: async () => {
    log.info("Running Daily at 4:00 AM --> Returning expired subscriptions to the free plan");
    await safeRun("downgradeExpiredSubscriptions", downgradeExpiredSubscriptions);
  },

  staffSessionPurge: async () => {
    log.info("Running Daily at 3:45 AM --> Purging ended staff console sessions");
    await safeRun("purgeStaffSessions", purgeStaffSessions);
  },

  inboxAutomation: async () => {
    log.info("Running Inbox Auto-Close Automation Job");
    await safeRun("runInboxAutomationCron", runInboxAutomationCron);
  },

  // TODO: re-enable once the report is working again.
  // weeklyInboxReport: async () => {
  //   log.info("Running Weekly Inbox Report --> Sundays 9:00 AM");
  //   await safeRun("getWeeklyConversationReport", getWeeklyConversationReport);
  // },
};

export const scheduledJobsWorker = new Worker(
  "scheduledJobs",
  async (job: Job) => {
    const handler = HANDLERS[job.name as ScheduledJobId];
    if (!handler) {
      // A scheduler removed while its last occurrence was already queued still
      // delivers that one job.
      log.warn(`No handler for scheduled job "${job.name}", skipping`);
      return;
    }
    await handler();
  },
  {
    connection: workerConnection,
    // Independent like the timers they replace: a long nightly job must not hold
    // up the four-minute drip tick behind it.
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 1_000 },
  },
);

scheduledJobsWorker.on("failed", (job, err) => {
  log.error(`Scheduled job "${job?.name}" failed: ${err.message}`);
});

scheduledJobsWorker.on("error", (err) => {
  log.error("Scheduled jobs worker error: %s", err);
});

log.info("Scheduled jobs worker initialized");
