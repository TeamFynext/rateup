import { FastifyInstance } from "fastify";
import {
  createCampaignHandler,
  deleteCampaignByIdHandler,
  getCampaignsHandler,
  sendCampaignHandler,
  updateCampaignByIdHandler,
} from "./campaign.controller";
import { $campaignRef } from "./campaign.schema";
import { campaignParticipantRoutes } from "./campaignParticipants/campaignParticipants.route";
import { campaignParticipantsSchemas } from "./campaignParticipants/campaignParticipants.schema";
import { checkSession } from "../../utils/checkSession";
import { getVerifySubscriptionHandler } from "../../utils/auth";
import { verifyCampaignMaxCountRestriction } from "./campaign.auth";
import { SubscriptionFeaturePathName } from "../../types/enums";

export async function campaignRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([
      SubscriptionFeaturePathName.WhatsAppCampaign,
    ]),
  );
  campaignParticipantsSchemas.forEach((schema) => server.addSchema(schema));
  server.register(campaignParticipantRoutes, {
    prefix: ":campaignId/participants",
  });

  server.post(
    "/",
    {
      schema: {
        body: $campaignRef("createCampaignInputSchema"),
      },
      preHandler: verifyCampaignMaxCountRestriction,
    },
    createCampaignHandler,
  );
  server.get(
    "/",
    {
      schema: {
        querystring: $campaignRef("getCampaignsQuerySchema"),
      },
    },
    getCampaignsHandler,
  );
  server.put(
    "/:campaignId",
    {
      schema: {
        params: $campaignRef("byCampaignIdParamsSchema"),
        body: $campaignRef("updateCampaignInputSchema"),
      },
    },
    updateCampaignByIdHandler,
  );
  server.delete(
    "/:campaignId",
    {
      schema: {
        params: $campaignRef("byCampaignIdParamsSchema"),
      },
    },
    deleteCampaignByIdHandler,
  );
  server.post(
    "/:campaignId/send",
    {
      schema: {
        params: $campaignRef("byCampaignIdParamsSchema"),
      },
    },
    sendCampaignHandler,
  );
}
