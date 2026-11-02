import type { FastifyInstance } from "fastify";

import { errorEnvelopeSchema, externalErrorResponses } from "../../shared/errors.js";
import { paginationQuerySchema } from "../pagination.js";
import { externalRateLimit } from "../../shared/rateLimit.js";
import { declareExternalScopes } from "../../shared/scopes.js";
import { surveyResponseListSchema } from "../surveys/surveys.schema.js";
import * as C from "./campaigns.controller.js";
import { requireCampaignSubscription } from "./guards.js";
import * as S from "./campaigns.schema.js";

/**
 * The partner campaigns API.
 *
 * Every route declares a full `response` map — the serializer drops anything a schema does
 * not name, which is what keeps raw Campaign rows (and the template's whole Meta payload)
 * from reaching third parties, as the pass-through this replaced did.
 */
export async function externalCampaignRoutes(server: FastifyInstance) {
  const TAG = ["Campaigns"];
  declareExternalScopes(server, { read: "campaigns.read", write: "campaigns.manage" });

  // The dashboard's plan gate for /api/campaign.
  server.addHook("preHandler", requireCampaignSubscription);

  const writeLimit = externalRateLimit({ max: 120, windowSeconds: 60, key: "extCampaignsWrite" });
  // A send spends conversation credits on every recipient, so it is held much tighter and
  // refused outright if the limiter cannot be consulted.
  const sendLimit = externalRateLimit({
    max: 10,
    windowSeconds: 60,
    key: "extCampaignSend",
    failClosed: true,
  });

  server.get(
    "/",
    {
      schema: {
        tags: TAG,
        summary: "List campaigns",
        description: "Newest first. Filter by `status`, `type` or `teamId`.",
        querystring: S.campaignListQuerySchema,
        response: { 200: S.campaignListSchema, ...externalErrorResponses },
      },
    },
    C.listCampaignsHandler,
  );

  server.get(
    "/:campaignId",
    {
      schema: {
        tags: TAG,
        summary: "Get a campaign",
        description: "The campaign, the audiences it sends to, drip stages and latest send.",
        params: S.campaignIdParamsSchema,
        response: { 200: S.campaignDetailSchema, ...externalErrorResponses },
      },
    },
    C.getCampaignHandler,
  );

  server.post<{ Body: S.CreateCampaignBody }>(
    "/",
    {
      preHandler: [writeLimit],
      schema: {
        tags: TAG,
        summary: "Create a campaign",
        description:
          "Created as a DRAFT with its recipients (audiences and/or contacts). Launch it " +
          "with `POST /campaigns/{campaignId}/send`.",
        body: S.createCampaignSchema,
        response: { 201: S.campaignDetailSchema, ...externalErrorResponses },
      },
    },
    C.createCampaignHandler,
  );

  server.delete<{ Params: S.CampaignIdParams }>(
    "/:campaignId",
    {
      preHandler: [writeLimit],
      schema: {
        tags: TAG,
        summary: "Delete a campaign",
        description:
          "Allowed in any state, as on the dashboard. Anything still queued or scheduled is " +
          "cancelled first.",
        params: S.campaignIdParamsSchema,
        response: { 200: S.deletedCampaignSchema, ...externalErrorResponses },
      },
    },
    C.deleteCampaignHandler,
  );

  server.post<{ Params: S.CampaignIdParams; Body: S.SendCampaignBody }>(
    "/:campaignId/send",
    {
      config: { permission: "campaigns.send", paid: true },
      preHandler: [writeLimit, sendLimit],
      schema: {
        tags: TAG,
        summary: "Send a campaign",
        description:
          "Queues the campaign now or at `scheduledAt` and returns the send session opened " +
          "for it. A DRIP campaign is started instead (its stages send on their own delays). " +
          "Send an `Idempotency-Key`: a retry with the same key replays the answer instead of " +
          "sending the campaign again.",
        params: S.campaignIdParamsSchema,
        body: S.sendCampaignSchema,
        response: {
          202: S.sendAcceptedSchema,
          ...externalErrorResponses,
          503: errorEnvelopeSchema,
        },
      },
    },
    C.sendCampaignHandler,
  );

  server.get(
    "/:campaignId/responses",
    {
      schema: {
        tags: TAG,
        summary: "List a campaign's survey responses",
        description:
          "Responses to the WhatsApp Flow on the campaign's template, newest first. Empty for " +
          "a campaign without a flow.",
        params: S.campaignIdParamsSchema,
        querystring: paginationQuerySchema,
        response: { 200: surveyResponseListSchema, ...externalErrorResponses },
      },
    },
    C.listCampaignResponsesHandler,
  );
}
