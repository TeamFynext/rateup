import { FastifyInstance } from "fastify/types/instance";
import { $extLCaReEventRef } from "./ext.ca_re.schema";
import {
  getCampaignRewardEvents_ByCampaignIdHandler,
  createCampaignRewardEventHandler,
} from "../../../../../loyalty/internal/campaignRewardEvent/ca_re.controller";

export async function externalLoyaltyCampaignRewardEventRoutes(
  server: FastifyInstance,
) {
  server.get(
    "/",
    {
      schema: {
        description: "Get all campaign reward events by campaign id",
        tags: ["Loyalty/Campaign -> RewardEvent"],
      },
    },
    getCampaignRewardEvents_ByCampaignIdHandler,
  );

  server.post(
    "/",
    {
      schema: {
        description: "Create campaign reward event",
        tags: ["Loyalty/Campaign -> RewardEvent"],
        body: $extLCaReEventRef("createCaRewardEventBody"),
      },
    },
    createCampaignRewardEventHandler,
  );
}
