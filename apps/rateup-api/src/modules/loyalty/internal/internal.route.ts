import { FastifyInstance } from "fastify";
import { lCampaignSchemas } from "./campaign/campaign.schema";
import { lCustomerSchemas } from "./customer/customer.schema";
import { lCampaignRewardEventSchema } from "./campaignRewardEvent/ca_re.schema";
import { referralCodeSchema } from "./referralCode/referralCode.schema";
import { lcRewardSchemas } from "./reward/reward.schema";
import { loyaltyCampaignRoutes } from "./campaign/campaign.route";
import { loyaltyRewardRoutes } from "./reward/reward.route";
import { loyaltyCampaignPublicRoutes } from "./campaign/campaign.public.route";
import { loyaltyCustomerRoutes } from "./customer/customer.route";
import { LoyaltyCampaign_RewardEvent_Routes } from "./campaignRewardEvent/ca_re.route";

export async function loyaltyInternalRoutes(server: FastifyInstance) {
  const modules = [
    lCampaignSchemas,
    lCustomerSchemas,
    lCampaignRewardEventSchema,
    referralCodeSchema,
    lcRewardSchemas,
  ];

  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.register(loyaltyCampaignRoutes, { prefix: "/campaign" });
  server.register(loyaltyCampaignPublicRoutes, { prefix: "campaign/public" });
  server.register(loyaltyRewardRoutes, { prefix: "/reward" });
  server.register(LoyaltyCampaign_RewardEvent_Routes, {
    prefix: "/:campaignId/reward-event",
  });
  server.register(loyaltyCustomerRoutes, { prefix: "/customer" });
}
