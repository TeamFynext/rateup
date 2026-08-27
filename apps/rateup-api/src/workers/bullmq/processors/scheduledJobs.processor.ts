// Consumer for the wall-clock schedule defined in queues/cron.queue.ts.
//
// These handler bodies were in-process `cron` timers until the schedule moved
// into Redis; they are otherwise unchanged. Each isolates its own failures with
// `safeRun`, so one broken action inside a tick does not cancel the others or
// fail (and therefore retry) the whole job.
import { Job, Worker } from "bullmq";

import { log } from "../../../utils/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { resetAnnualCounts, resetMonthlyCounts } from "../../../modules/stats/stats.service.js";
import {
  endSurveyCronAction,
  publishSurveyCronAction,
} from "../../../modules/survey/survey.service.js";
import { sendCampaignCronAction } from "../../../modules/campaign/campaign.service.js";
import {
  sendShopifySurveyCronAction,
  sendTemplateForShopifyAbandonedCheckouts,
} from "../../../modules/integrations/shopify/shopify.service.js";
import { refreshZohoTokensAndWebhooks } from "../../../modules/integrations/external/zoho/zoho.service.js";
import {
  processDripCampaigns,
  sendSchedulesWaMessages,
} from "../../../modules/whatsapp/wa_message_scheduler.js";
import { runInboxAutomationCron } from "../../../modules/whatsapp/inbox/automation/inboxautomation.service.js";
import {
  checkBirthdayEventTriggers,
  checkInactivityEventTriggers,
  checkPointsExpiration,
  checkPointsExpiryAlerts,
} from "../../../modules/loyalty/settings/eventTriggerCron.service.js";
import { getWeeklyConversationReport } from "../../shared/bullmqCronJobs/sendMail/weeklyMail.js";
import { downgradeExpiredSubscriptions } from "../../../modules/subscription/subscription.service.js";
import { subscriptionExpiryAlert } from "../../../utils/email/payments/subscriptionExpiryAlert.js";
import type { ScheduledJobId } from "../queues/cron.queue.js";

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
      safeRun("sendShopifySurveyCronAction", sendShopifySurveyCronAction),
    ]);
  },

  dripCampaigns: async () => {
    log.info("Running every 4min JOB --> Drip Campaign Processing");
    await safeRun("processDripCampaigns", processDripCampaigns);
  },

  hourlyJobs: async () => {
    log.info("Running hourly Jobs");
    await safeRun(
      "sendTemplateForShopifyAbandonedCheckouts",
      sendTemplateForShopifyAbandonedCheckouts,
    );
  },

  zohoRefresh: async () => {
    log.info("Running every 45min JOB --> Zoho token refresh and webhook registration");
    await safeRun("refreshZohoTokensAndWebhooks", refreshZohoTokensAndWebhooks);
  },

  midnightStatsReset: async () => {
    log.info("Running Every Day 12.30 AM --> Stats Reset");
    await safeRun("resetMonthlyCounts", resetMonthlyCounts);
    await safeRun("resetAnnualCounts", resetAnnualCounts);
  },

  loyaltyBirthdayCheck: async () => {
    log.info("Running Daily at 12:00 AM --> Loyalty Birthday Event Triggers");
    await safeRun("checkBirthdayEventTriggers", checkBirthdayEventTriggers);
  },

  loyaltyPointsExpiration: async () => {
    log.info("Running Daily at 1:00 AM --> Loyalty Points Expiration");
    await safeRun("checkPointsExpiration", checkPointsExpiration);
  },

  loyaltyInactivityCheck: async () => {
    log.info("Running Daily at 2:00 AM --> Loyalty Inactivity Event Triggers");
    await safeRun("checkInactivityEventTriggers", checkInactivityEventTriggers);
  },

  loyaltyPointsExpiryAlerts: async () => {
    log.info("Running Daily at 3:00 AM --> Loyalty Points Expiry Alerts (14 days before expiry)");
    await safeRun("checkPointsExpiryAlerts", checkPointsExpiryAlerts);
  },

  subscriptionExpiryAlerts: async () => {
    log.info("Running Daily at 3:30 AM --> Subscription expiry reminders");
    await safeRun("subscriptionExpiryAlert", subscriptionExpiryAlert);
  },

  downgradeExpiredSubscriptions: async () => {
    log.info("Running Daily at 4:00 AM --> Returning expired subscriptions to the free plan");
    await safeRun("downgradeExpiredSubscriptions", downgradeExpiredSubscriptions);
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
