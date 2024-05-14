import { FastifyInstance } from "fastify";

import { externalCampaignParticipantRoutes } from "./participants/campaign_participants.external.route";
import {
  createCampaignHandler,
  getCampaignsHandler,
  deleteCampaignByIdHandler,
  sendCampaignHandler,
} from "../../../campaign/campaign.controller";
import { $campaignRef } from "../../../campaign/campaign.schema";

export async function externalCampaignRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        tags: ["Campaign"],
        description: "Create a new campaign",
        summary: "Create a new campaign",
        body: $campaignRef("createCampaignInputSchema"),
      },
    },
    createCampaignHandler,
  );
  server.get(
    "/",
    {
      schema: {
        tags: ["Campaign"],
        description: "Get all campaigns",
        summary: "Get all campaigns",
        response: {
          200: {
            type: "array",
            items: $campaignRef("campaignResponseSchema"),
          },
        },
      },
    },
    getCampaignsHandler,
  );

  server.delete(
    "/:campaignId",
    {
      schema: {
        tags: ["Campaign"],
        description: "Delete a campaign by ID",
        summary: "Delete a campaign by ID",
        params: $campaignRef("byCampaignIdParamsSchema"),
      },
    },
    deleteCampaignByIdHandler,
  );

  server.put(
    "/:campaignId/send",
    {
      schema: {
        tags: ["Campaign"],
        description: "Send a campaign by ID",
        summary: "Send a campaign by ID",
        params: $campaignRef("byCampaignIdParamsSchema"),
        body: $campaignRef("sendCampaignInputSchema"),
      },
    },
    sendCampaignHandler,
  );

  server.register(externalCampaignParticipantRoutes, {
    prefix: "/:campaignId/participants",
  });
}
