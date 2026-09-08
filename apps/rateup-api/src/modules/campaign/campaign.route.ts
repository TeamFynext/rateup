import { FastifyInstance } from "fastify";
import {
  createCampaignHandler,
  deleteCampaignByIdHandler,
  getDripScheduleHandler,
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
  bySendIdParamsSchema,
  CreateCampaignInput,
  createCampaignInputSchema,
  getCampaignsQuerySchema,
  retryPolicyInputSchema,
  sendCampaignInputSchema,
  sendTestInputSchema,
  sendParticipantsQuerySchema,
  sendPreflightQuerySchema,
  updateCampaignInputSchema,
} from "./campaign.schema.js";
import {
  cancelPendingRetriesHandler,
  getCampaignAnalyticsHandler,
  getCampaignRetryPolicyHandler,
  getCampaignSendParticipantsHandler,
  getCampaignSendsHandler,
  sendCampaignTestHandler,
  updateCampaignRetryPolicyHandler,
} from "./campaignAnalytics.controller.js";
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

  // A drip books no send ahead of time — the cron derives each stage's moment as
  // it ticks — so "what happens next" has to be computed rather than read.
  server.get(
    "/:campaignId/drip-schedule",
    {
      schema: {
        params: byCampaignIdParamsSchema,
      },
    },
    getDripScheduleHandler,
  );

  server.post(
    "/:campaignId/send",
    {
      schema: {
        params: byCampaignIdParamsSchema,
        // `sendCampaignInputSchema` has existed since the send dialog was built;
        // the route just never registered it, so the body was read untyped.
        body: sendCampaignInputSchema,
      },
    },
    sendCampaignHandler,
  );

  // A rehearsal, not a send: no CampaignSend, no participant, no counters.
  server.post(
    "/:campaignId/send-test",
    {
      schema: {
        params: byCampaignIdParamsSchema,
        body: sendTestInputSchema,
      },
    },
    sendCampaignTestHandler,
  );

  // ── Per-attempt analytics ───────────────────────────────────────────────────
  // Every send and resend is a CampaignSend row, so "this retry re-attempted 340
  // and 210 landed" is a query rather than a guess.
  server.get(
    "/:campaignId/sends",
    { schema: { params: byCampaignIdParamsSchema } },
    getCampaignSendsHandler,
  );
  server.get(
    "/:campaignId/sends/:sendId/participants",
    {
      schema: {
        params: bySendIdParamsSchema,
        querystring: sendParticipantsQuerySchema,
      },
    },
    getCampaignSendParticipantsHandler,
  );
  server.get(
    "/:campaignId/analytics",
    { schema: { params: byCampaignIdParamsSchema } },
    getCampaignAnalyticsHandler,
  );

  // ── Automatic retries ───────────────────────────────────────────────────────
  server.get(
    "/:campaignId/retry-policy",
    { schema: { params: byCampaignIdParamsSchema } },
    getCampaignRetryPolicyHandler,
  );
  server.put(
    "/:campaignId/retry-policy",
    {
      schema: {
        params: byCampaignIdParamsSchema,
        body: retryPolicyInputSchema,
      },
    },
    updateCampaignRetryPolicyHandler,
  );
  server.post(
    "/:campaignId/retries/cancel",
    { schema: { params: byCampaignIdParamsSchema } },
    cancelPendingRetriesHandler,
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
