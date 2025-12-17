import { FastifyInstance } from "fastify";
import {
  createCampaignParticipantsFromContactsHandler,
  createCampaignParticipantsFromGroupHandler,
  createCampaignParticipantsHandler,
  deleteCampaignParticipantByIdHandler,
  getCampaignParticipantByIdHandler,
  getCampaignParticipantsByCampaignIdHandler,
  multipleDeleteCampaignParticipantHandler,
} from "./campaignParticipants.controller.js";
import { $campaignParticipantsRef } from "./campaignParticipants.schema.js";
import { $campaignRef } from "../campaign.schema.js";

export async function campaignParticipantRoutes(server: FastifyInstance) {
  server.post(
    "/contacts",
    {
      schema: {
        body: $campaignParticipantsRef(
          "createCampaignParticipantsFromContactsSchema",
        ),
      },
    },
    createCampaignParticipantsFromContactsHandler,
  );
  server.post(
    "/groups",
    {
      schema: {
        body: $campaignParticipantsRef(
          "createCampaignParticipantsFromGroupsSchema",
        ),
      },
    },
    createCampaignParticipantsFromGroupHandler,
  );

  server.post(
    "/",
    {
      schema: {
        body: $campaignParticipantsRef("createCampaignParticipantsSchema"),
      },
    },
    createCampaignParticipantsHandler,
  );

  server.delete(
    "/:campaignParticipantId",
    {
      schema: {
        params: $campaignParticipantsRef("byCampaignParticipantIdParamsSchema"),
      },
    },
    deleteCampaignParticipantByIdHandler,
  );
  server.get(
    "/",
    {
      schema: {
        params: $campaignRef("byCampaignIdParamsSchema"),
      },
    },
    getCampaignParticipantsByCampaignIdHandler,
  );
  server.get(
    "/:campaignParticipantId",
    {
      schema: {
        params: $campaignParticipantsRef("byCampaignParticipantIdParamsSchema"),
      },
    },
    getCampaignParticipantByIdHandler,
  );
  server.delete(
    "/multiple-delete",
    {
      schema: {
        body: $campaignParticipantsRef("deleteCampaignParticipantsSchema"),
      },
    },
    multipleDeleteCampaignParticipantHandler,
  );
}
