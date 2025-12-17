import { FastifyInstance } from "fastify";
import { externalCampaignParticipantRoutes } from "./participants/campaign_participants.external.route.js";
import { $campaignRef } from "./internal-copy/campaign/campaign.schema.js";
import {
  createCampaignHandler,
  deleteCampaignByIdHandler,
  getCampaignsHandler,
  sendCampaignHandler,
} from "./internal-copy/campaign/campaign.controller.js";
import { getResponseByCampaignByIdHandler } from "../../../campaign/campaign.controller.js";

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
    getResponseByCampaignByIdHandler,
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
