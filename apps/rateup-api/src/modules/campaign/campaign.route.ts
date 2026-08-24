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
import { campaignParticipantRoutes } from "./campaignParticipants/campaignParticipants.route.js";
import { checkSession } from "../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { requireFeature, TeamFeature } from "../../utils/permissions.js";
import { verifyCampaignMaxLimit } from "./campaign.util.js";
import {
  byCampaignIdParamsSchema,
  CreateCampaignInput,
  createCampaignInputSchema,
  getCampaignsQuerySchema,
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
      preHandler: verifyCampaignMaxLimit,
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
