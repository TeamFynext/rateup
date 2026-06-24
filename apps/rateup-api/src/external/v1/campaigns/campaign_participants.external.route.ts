import { FastifyInstance } from "fastify";
import { byCampaignIdParamsSchema } from "../../../modules/campaign/campaign.schema.js";
import {
  campaignParticipantResponseSchema,
  createCampaignParticipantsFromContactsSchema,
} from "../../../modules/campaign/campaignParticipants/campaignParticipants.schema.js";
import {
  createCampaignParticipantsFromContactsExternalController,
  getCampaignParticipantsByCampaignIdExternalController,
} from "./campaigns.external.controller.js";

export async function externalCampaignParticipantRoutes(server: FastifyInstance) {
  server.post(
    "/contacts",
    {
      schema: {
        tags: ["Campaign/Participants"],
        description: "Create participants from contacts",
        summary: "Create participants from contacts",
        body: createCampaignParticipantsFromContactsSchema,
        response: campaignParticipantResponseSchema,
      },
    },
    createCampaignParticipantsFromContactsExternalController,
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["Campaign/Participants"],
        description: "Get all participants of a campaign",
        summary: "Get all participants of a campaign",
        params: byCampaignIdParamsSchema,
        response: {
          200: campaignParticipantResponseSchema.array(),
        },
      },
    },
    getCampaignParticipantsByCampaignIdExternalController,
  );
}
