import { FastifyInstance } from "fastify/types/instance";
import { $extLCSchema } from "./ext.campaign.schema";
import {
  getCampaignByIdHandler,
  getCampaignsHandler,
  createCampaignHandler,
  updateCampaignHandler,
} from "../../internal/campaign/campaign.controller";
import { externalLoyaltyCampaignRewardEventRoutes } from "./rewardEvent/ext.ca_re.route";

export async function externalLoyaltyCampaignRoutes(server: FastifyInstance) {
  server.get(
    "/",
    {
      schema: {
        description: "Get all campaigns",
        tags: ["Loyalty Campaign"],
        summary: "Get all campaigns",
        response: {
          "2xx": {
            type: "array",
            items: $extLCSchema("lCampaignSchema"),
          },
        },
      },
    },
    getCampaignsHandler,
  );

  server.get(
    "/:campaignId",
    {
      schema: {
        description: "Get a campaign by id",
        tags: ["Loyalty Campaign"],
        summary: "Get a campaign by id",
        response: {
          "2xx": $extLCSchema("lCampaignSchema"),
        },
      },
    },
    getCampaignByIdHandler,
  );

  server.post(
    "/",
    {
      schema: {
        description: "Create a campaign",
        tags: ["Loyalty Campaign"],
        summary: "Create a campaign",
        body: $extLCSchema("createLCampaignSchema"),
        response: {
          "2xx": $extLCSchema("lCampaignSchema"),
        },
      },
    },
    createCampaignHandler,
  );

  server.put(
    "/:campaignId",
    {
      schema: {
        description: "Update a campaign",
        tags: ["Loyalty Campaign"],
        summary: "Update a campaign",
        body: $extLCSchema("updateLCampaignSchema"),
        response: {
          "2xx": $extLCSchema("lCampaignSchema"),
        },
      },
    },
    updateCampaignHandler,
  );
}
