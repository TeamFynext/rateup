import { FastifyInstance } from "fastify";
import {
  createCampaignInputSchema,
  campaignResponseByIdSchema,
  byCampaignIdParamsSchema,
  sendCampaignInputSchema,
} from "../../../modules/campaigns/campaign.schema.js";
import {
  createCampaignExternalController,
  deleteCampaignByIdExternalController,
  getCampaignResponsesExternalController,
  getCampaignsExternalController,
  sendCampaignExternalController,
} from "./campaigns.external.controller.js";
import { declareExternalScopes } from "../../shared/scopes.js";

export async function externalCampaignRoutes(server: FastifyInstance) {
  declareExternalScopes(server, { read: "campaigns.read", write: "campaigns.manage" });

  server.post(
    "/",
    {
      schema: {
        tags: ["Campaign"],
        description: "Create a new campaign",
        summary: "Create a new campaign",
        body: createCampaignInputSchema,
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
        params: byCampaignIdParamsSchema,
        response: {
          200: campaignResponseByIdSchema.array(),
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
        params: byCampaignIdParamsSchema,
      },
    },
    deleteCampaignByIdExternalController,
  );

  server.put(
    "/:campaignId/send",
    {
      config: { permission: "campaigns.send", paid: true },
      schema: {
        tags: ["Campaign"],
        description: "Send a campaign by ID",
        summary: "Send a campaign by ID",
        params: byCampaignIdParamsSchema,
        body: sendCampaignInputSchema,
      },
    },
    sendCampaignExternalController,
  );

  // server.register(externalCampaignParticipantRoutes, {
  //   prefix: "/:campaignId/participants",
  // });
}
