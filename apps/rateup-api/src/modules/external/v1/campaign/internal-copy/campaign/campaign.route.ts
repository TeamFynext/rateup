import { FastifyInstance } from "fastify";
import {
  createCampaignHandler,
  deleteCampaignByIdHandler,
  getCampaignsHandler,
  sendCampaignHandler,
  updateCampaignByIdHandler,
} from "./campaign.controller.js";
import { $campaignRef } from "./campaign.schema.js";
import { campaignParticipantRoutes } from "./campaignParticipants/campaignParticipants.route.js";
import { verifyCampaignMaxCountRestriction } from "./campaign.auth.js";
import { SubscriptionFeaturePathName } from "../../../../../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../../../../../utils/auth.js";
import { checkSession } from "../../../../../../utils/checkSession.js";

export async function campaignRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([
      SubscriptionFeaturePathName.WhatsAppCampaign,
    ]),
  );
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
