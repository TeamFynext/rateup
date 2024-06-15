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
import { checkSession } from "../../utils/checkSession";
import { getVerifySubscriptionHandler } from "../../utils/auth";
import { verifyCampaignMaxCountRestriction } from "./campaign.auth";
import { SubscriptionFeaturePathName } from "../../types/enums";
import { verifyMessageMonthlyLimitRestriction } from "../whatsapp/messageTemplates/wa_templates.auth";

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
      preHandler: verifyMessageMonthlyLimitRestriction,
      schema: {
        params: $campaignRef("byCampaignIdParamsSchema"),
      },
    },
    sendCampaignHandler,
  );
}
