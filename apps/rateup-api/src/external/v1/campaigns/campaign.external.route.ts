import { FastifyInstance } from "fastify";
import { externalCampaignParticipantRoutes } from "./campaign_participants.external.route.js";
import { $campaignRef } from "../../../modules/campaign/campaign.schema.js";
import {
  createCampaignExternalController,
  deleteCampaignByIdExternalController,
  getCampaignResponsesExternalController,
  getCampaignsExternalController,
  sendCampaignExternalController,
} from "./campaigns.external.controller.js";

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
    createCampaignExternalController,
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["Campaign"],
        description: "Get all campaigns",
        summary: "Get all campaigns",
      },
    },
    getCampaignsExternalController,
  );

  server.get(
    "/:campaignId/responses",
    {
      schema: {
        tags: ["Campaign"],
        description: "Get campaign responses by ID",
        summary: "Get campaign responses by ID",
        response: {
          200: {
            type: "array",
            items: $campaignRef("campaignResponseByIdSchema"),
          },
        },
      },
    },
    getCampaignResponsesExternalController,
  );

  server.delete(
    "/:campaignId",
    {
      schema: {
        tags: ["Campaign"],
        description: "Delete a campaign by ID",
        summary: "Delete a campaign by ID",
      },
    },
    deleteCampaignByIdExternalController,
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
    sendCampaignExternalController,
  );

  server.register(externalCampaignParticipantRoutes, {
    prefix: "/:campaignId/participants",
  });
}
