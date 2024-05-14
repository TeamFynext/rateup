import { FastifyInstance } from "fastify/types/instance";
import {
  createCampaignRewardEventHandler,
  getCampaignRewardEvents_ByCampaignIdHandler,
} from "../../../internal/campaignRewardEvent/ca_re.controller";
import { $extLCaReEventRef } from "./ext.ca_re.schema";

export async function externalLoyaltyCampaignRewardEventRoutes(
  server: FastifyInstance,
) {
  server.get(
    "/",
    {
      schema: {
        description: "Get all campaign reward events by campaign id",
        tags: ["Loyalty Campaign -> RewardEvent"],
      },
    },
    getCampaignRewardEvents_ByCampaignIdHandler,
  );

  server.post(
    "/",
    {
      schema: {
        description: "Create campaign reward event",
        tags: ["Loyalty Campaign -> RewardEvent"],
        body: $extLCaReEventRef("createCaRewardEventBody"),
      },
    },
    createCampaignRewardEventHandler,
  );
}
