import { FastifyInstance } from "fastify";
import { $campaignRef } from "../../../../campaign/campaign.schema.js";
import {
  createCampaignParticipantsFromContactsHandler,
  getCampaignParticipantsByCampaignIdHandler,
} from "../../../../campaign/campaignParticipants/campaignParticipants.controller.js";
import { $campaignParticipantsRef } from "../../../../campaign/campaignParticipants/campaignParticipants.schema.js";

export async function externalCampaignParticipantRoutes(
  server: FastifyInstance,
) {
  server.post(
    "/contacts",
    {
      schema: {
        tags: ["Campaign/Participants"],
        description: "Create participants from contacts",
        summary: "Create participants from contacts",
        body: $campaignParticipantsRef(
          "createCampaignParticipantsFromContactsSchema",
        ),
        response: {
          200: $campaignParticipantsRef("campaignParticipantResponseSchema"),
        },
      },
    },
    createCampaignParticipantsFromContactsHandler,
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["Campaign/Participants"],
        description: "Get all participants of a campaign",
        summary: "Get all participants of a campaign",
        params: $campaignRef("byCampaignIdParamsSchema"),
        response: {
          200: {
            type: "array",
            items: $campaignParticipantsRef(
              "campaignParticipantResponseSchema",
            ),
          },
        },
      },
    },
    getCampaignParticipantsByCampaignIdHandler,
  );
}
