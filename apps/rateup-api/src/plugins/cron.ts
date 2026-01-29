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
import { subscriptionExpiryAlert } from "../utils/email/payments/subscriptionExpiryAlert.js";
import {
  processDripCampaigns,
  sendSchedulesWaMessages,
} from "../modules/whatsapp/wa_message_scheduler.js";

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
            sendShopifySurveyCronAction(),
            sendSchedulesWaMessages(),
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
        name: "midnightStatsReset",
        cronTime: "30 0 * * *",
        onTick: async () => {
          server.log.info("Running Every Day 12.30 AM --> Stats Reset");
          await resetMonthlyCounts();
          await resetAnnualCounts();
        },
        start: true,
      },
    ],
  });
}
