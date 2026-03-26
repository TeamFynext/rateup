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
import {
  byCampaignParticipantIdParamsSchema,
  createCampaignParticipantsFromContactsSchema,
  createCampaignParticipantsFromGroupsSchema,
  createCampaignParticipantsSchema,
  deleteCampaignParticipantsSchema,
  paginateQuerySchema,
} from "./campaignParticipants.schema.js";
import { byCampaignIdParamsSchema } from "../campaign.schema.js";

export async function campaignParticipantRoutes(server: FastifyInstance) {
  server.post(
    "/contacts",
    {
      schema: {
        body: createCampaignParticipantsFromContactsSchema,
      },
    },
    createCampaignParticipantsFromContactsHandler,
  );
  server.post(
    "/groups",
    {
      schema: {
        body: createCampaignParticipantsFromGroupsSchema,
      },
    },
    createCampaignParticipantsFromGroupHandler,
  );

  server.post(
    "/",
    {
      schema: {
        body: createCampaignParticipantsSchema,
      },
    },
    createCampaignParticipantsHandler,
  );

  server.delete(
    "/:campaignParticipantId",
    {
      schema: {
        params: byCampaignParticipantIdParamsSchema,
      },
    },
    deleteCampaignParticipantByIdHandler,
  );
  server.get(
    "/",
    {
      schema: {
        params: byCampaignIdParamsSchema,
        querystring: paginateQuerySchema,
      },
    },
    getCampaignParticipantsByCampaignIdHandler,
  );
  server.get(
    "/:campaignParticipantId",
    {
      schema: {
        params: byCampaignParticipantIdParamsSchema,
      },
    },
    getCampaignParticipantByIdHandler,
  );
  server.delete(
    "/multiple-delete",
    {
      schema: {
        body: deleteCampaignParticipantsSchema,
      },
    },
    multipleDeleteCampaignParticipantHandler,
  );
}
