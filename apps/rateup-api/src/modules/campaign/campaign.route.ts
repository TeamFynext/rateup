import { FastifyInstance } from "fastify";
import {
  createCampaignHandler,
  deleteCampaignByIdHandler,
  getCampaignFilterForFlowsHandler,
  getCampaignsHandler,
  getCampaignStatsHandler,
  getResponseByCampaignByIdHandler,
  getResponseExcelByCampaignByIdHandler,
  getCampaignSendPreflightHandler,
  sendCampaignHandler,
  updateCampaignByIdHandler,
} from "./campaign.controller.js";
import { campaignParticipantRoutes } from "./campaignParticipants/campaignParticipants.route.js";
import { checkSession } from "../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { requireFeature, TeamFeature } from "../../utils/permissions.js";
import {
  byCampaignIdParamsSchema,
  CreateCampaignInput,
  createCampaignInputSchema,
  getCampaignsQuerySchema,
  sendPreflightQuerySchema,
  updateCampaignInputSchema,
} from "./campaign.schema.js";
import { bySurveyIdSchema } from "../surveyTheme/surveyTheme.schema.js";

export async function campaignRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.WhatsappCampaign]),
  );
  server.addHook("preHandler", requireFeature(TeamFeature.campaigns));
  server.register(campaignParticipantRoutes, {
    prefix: ":campaignId/participants",
  });

  server.post<{ Body: CreateCampaignInput }>(
    "/",
    {
      schema: {
        body: createCampaignInputSchema,
      },
    },
    createCampaignHandler,
  );
  server.get(
    "/",
    {
      schema: {
        querystring: getCampaignsQuerySchema,
      },
    },
    getCampaignsHandler,
  );
  server.put(
    "/:campaignId",
    {
      schema: {
        params: byCampaignIdParamsSchema,
        body: updateCampaignInputSchema,
      },
    },
    updateCampaignByIdHandler,
  );
  server.delete(
    "/:campaignId",
    {
      schema: {
        params: byCampaignIdParamsSchema,
      },
    },
    deleteCampaignByIdHandler,
  );
  // Read before opening the send dialog: what this campaign would cost against the
  // conversation allowance, and whether it fits.
  server.get(
    "/:campaignId/send-preflight",
    {
      schema: {
        params: byCampaignIdParamsSchema,
        querystring: sendPreflightQuerySchema,
      },
    },
    getCampaignSendPreflightHandler,
  );

  server.post(
    "/:campaignId/send",
    {
      schema: {
        params: byCampaignIdParamsSchema,
      },
    },
    sendCampaignHandler,
  );
  server.get(
    "/flow/filter",
    { schema: { querystring: bySurveyIdSchema } },
    getCampaignFilterForFlowsHandler,
  );
  server.get(
    "/:campaignId/responses",
    {
      schema: {
        params: byCampaignIdParamsSchema,
      },
    },
    getResponseByCampaignByIdHandler,
  );
  server.post(
    "/:campaignId/download",
    {
      schema: {
        params: byCampaignIdParamsSchema,
      },
    },
    getResponseExcelByCampaignByIdHandler,
  );

  //route for campaign stats by campaignId
  server.get(
    "/:campaignId/stats",
    {
      schema: {
        params: byCampaignIdParamsSchema,
      },
    },
    getCampaignStatsHandler,
  );
}
