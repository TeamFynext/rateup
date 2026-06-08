import { FastifyInstance } from "fastify";
import fastifyCron from "fastify-cron";
import {
  resetAnnualCounts,
  resetMonthlyCounts,
} from "../modules/stats/stats.service.js";
import {
  endSurveyCronAction,
  publishSurveyCronAction,
} from "../modules/survey/survey.service.js";
import { sendCampaignCronAction } from "../modules/campaign/campaign.service.js";
import {
  sendShopifySurveyCronAction,
  sendTemplateForShopifyAbandonedCheckouts,
} from "../modules/integrations/shopify/shopify.service.js";
import { refreshZohoTokensAndWebhooks } from "../modules/integrations/external/zoho/zoho.service.js";
import { subscriptionExpiryAlert } from "../utils/email/payments/subscriptionExpiryAlert.js";
import {
  processDripCampaigns,
  sendSchedulesWaMessages,
} from "../modules/whatsapp/wa_message_scheduler.js";
import { runInboxAutomationCron } from "../modules/whatsapp/inbox/automation/inboxautomation.service.js";
import {
  checkBirthdayEventTriggers,
  checkInactivityEventTriggers,
  checkPointsExpiration,
} from "../modules/loyalty/settings/eventTriggerCron.service.js";

export async function registerCronJobs(
  server,
  // : FastifyInstance
) {
  await server.register(fastifyCron, {
    jobs: [
      {
        name: "publishSurveys",
        cronTime: "0/15 * * * *",
        onTick: async () => {
          server.log.info(
            "Running every 15min JOB --> Survey Publish Updations",
          );
          await Promise.all([
            publishSurveyCronAction(),
            endSurveyCronAction(),
            sendCampaignCronAction(),
            sendSchedulesWaMessages(),
            sendShopifySurveyCronAction(),
          ]);
        },
        start: true,
      },
      {
        name: "dripCampaigns",
        cronTime: "*/4 * * * *",
        onTick: async () => {
          server.log.info(
            "Running every 4min JOB --> Drip Campaign Processing",
          );
          await processDripCampaigns();
        },
        start: true,
        timeZone: "Etc/UTC",
      },
      {
        name: "hourlyJobs",
        cronTime: "0 * * * *",
        onTick: async () => {
          server.log.info("Running hourly Jobs");
          await sendTemplateForShopifyAbandonedCheckouts();
        },
        start: true,
      },
      {
        name: "zohoRefresh",
        cronTime: "*/45 * * * *",
        onTick: async () => {
          server.log.info(
            "Running every 45min JOB --> Zoho token refresh and webhook registration",
          );
          await refreshZohoTokensAndWebhooks();
        },
        start: true,
        timeZone: "Etc/UTC",
      },
      {
        name: "midnightStatsReset",
        cronTime: "30 0 * * *",
        onTick: async () => {
          server.log.info("Running Every Day 12.30 AM --> Stats Reset");
          await resetMonthlyCounts();
          await resetAnnualCounts();
        },
        start: true,
      },
      {
        name: "loyaltyBirthdayCheck",
        cronTime: "0 0 * * *", // Every day at 12:00 AM
        onTick: async () => {
          server.log.info(
            "Running Daily at 12:00 AM --> Loyalty Birthday Event Triggers",
          );
          await checkBirthdayEventTriggers();
        },
        start: true,
      },
      {
        name: "loyaltyInactivityCheck",
        cronTime: "0 2 * * *", // Every day at 2:00 AM
        onTick: async () => {
          server.log.info(
            "Running Daily at 2:00 AM --> Loyalty Inactivity Event Triggers",
          );
          await checkInactivityEventTriggers();
        },
        start: true,
      },
      {
        name: "loyaltyPointsExpiration",
        cronTime: "0 1 * * *", // Every day at 1:00 AM
        onTick: async () => {
          server.log.info(
            "Running Daily at 1:00 AM --> Loyalty Points Expiration",
          );
          await checkPointsExpiration();
        },
        start: true,
      },
      {
        name: "inboxAutomation",
        cronTime: "0 * * * *", // Every hour
        onTick: async () => {
          server.log.info("Running Inbox Auto-Close Automation Job");
          await runInboxAutomationCron();
        },
        start: true,
      },
    ],
  });
}
