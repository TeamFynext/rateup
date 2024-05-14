import { FastifyInstance } from "fastify/types/instance";
import { externalLoyaltyCampaignRoutes } from "./campaign/ext.campaign.route";
import { loyaltyCampaignExternalSchemas } from "./campaign/ext.campaign.schema";
import { externalLoyaltyRewardRoutes } from "./reward/ext.reward.routes";
import { extLRewardSchemas } from "./reward/ext.reward.schema";
import { extLCustomerSchemas } from "./customer/ext.customer.schema";
import { externalLoyaltyCustomerRoutes } from "./customer/ext.customer.route";
import { externalLoyaltyCampaignRewardEventRoutes } from "./campaign/rewardEvent/ext.ca_re.route";
import { externalLoyaltyCustomerRewardEventRoutes } from "./customer/rewardEvent/ext.cu_re.route";
import { extLCaReEventSchema } from "./campaign/rewardEvent/ext.ca_re.schema";
import { externalLoyaltyReferralCodeRoutes } from "./campaign/referralCode/ext.refCode.route";
import { extRefCodeSchema } from "./campaign/referralCode/ext.refCode.schema";
import { verifyLoyaltyApiKeyHook } from "./external.loyalty.auth";

export async function externalLoyaltyRoutes(server: FastifyInstance) {
  const modules = [
    loyaltyCampaignExternalSchemas,
    extLRewardSchemas,
    extLCustomerSchemas,
    extLCaReEventSchema,
    extRefCodeSchema,
  ];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.addHook("preHandler", verifyLoyaltyApiKeyHook);

  server.register(externalLoyaltyCampaignRoutes, { prefix: "/campaign" });
  server.register(externalLoyaltyCampaignRewardEventRoutes, {
    prefix: "/campaign/:campaignId/reward-event",
  });
  server.register(externalLoyaltyRewardRoutes, { prefix: "/reward" });
  server.register(externalLoyaltyCustomerRoutes, { prefix: "/customer" });
  server.register(externalLoyaltyCustomerRewardEventRoutes, {
    prefix: "/customer/:lCustomerId/reward-event",
  });
  server.register(externalLoyaltyReferralCodeRoutes, {
    prefix: "/referral-code",
  });
}
