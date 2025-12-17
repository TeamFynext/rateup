import { FastifyInstance } from "fastify";
import {
  createCampaignHandler,
  deleteCampaignByIdHandler,
  getCampaignFilterForFlowsHandler,
  getCampaignsHandler,
  getCampaignStatsHandler,
  getResponseByCampaignByIdHandler,
  getResponseExcelByCampaignByIdHandler,
  sendCampaignHandler,
  updateCampaignByIdHandler,
} from "./campaign.controller.js";
import { $campaignRef } from "./campaign.schema.js";
import { campaignParticipantRoutes } from "./campaignParticipants/campaignParticipants.route.js";
import { checkSession } from "../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { verifyMessageMonthlyLimitRestrictionForCampaign } from "./campaign.auth.js";
import { $surveyThemeRef } from "../surveyTheme/surveyTheme.schema.js";
import { verifyCampaignMaxLimit } from "./campaign.util.js";

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
      preHandler: verifyCampaignMaxLimit,
      schema: {
        body: $campaignRef("createCampaignInputSchema"),
      },
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
      preHandler: verifyMessageMonthlyLimitRestrictionForCampaign,
      schema: {
        params: $campaignRef("byCampaignIdParamsSchema"),
      },
    },
    sendCampaignHandler,
  );
  server.get(
    "/flow/filter",
    { schema: { querystring: $surveyThemeRef("bySurveyIdSchema") } },
    getCampaignFilterForFlowsHandler,
  );
  server.get(
    "/:campaignId/responses",
    {
      schema: {
        params: $campaignRef("byCampaignIdParamsSchema"),
      },
    },
    getResponseByCampaignByIdHandler,
  );
  server.post(
    "/:campaignId/download",
    {
      schema: {
        params: $campaignRef("byCampaignIdParamsSchema"),
      },
    },
    getResponseExcelByCampaignByIdHandler,
  );

  //route for campaign stats by campaignId
  server.get(
    "/:campaignId/stats",
    {
      schema: {
        params: $campaignRef("byCampaignIdParamsSchema"),
      },
    },
    getCampaignStatsHandler,
  );
}
