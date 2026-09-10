import { FastifyInstance } from "fastify";

import {
  getFeedbackDraftsHandler,
  getFeedbackOverviewHandler,
  getFeedbackResultsHandler,
  listFeedbackRequestsHandler,
  resetFeedbackHandler,
  setupFeedbackHandler,
  submitFeedbackFlowHandler,
  updateFeedbackSettingHandler,
} from "./feedback.controller.js";
import {
  feedbackDraftsResponseSchema,
  feedbackErrorSchema,
  feedbackOverviewSchema,
  feedbackRequestsPageSchema,
  feedbackRequestsQuerySchema,
  feedbackResultsQuerySchema,
  feedbackResultsSchema,
  setupFeedbackBodySchema,
  updateFeedbackSettingSchema,
} from "./feedback.schema.js";

// Session, subscription and TeamFeature.loyalty hooks come from the loyalty root plugin.
export async function loyaltyFeedbackRoutes(server: FastifyInstance) {
  const errors = {
    400: feedbackErrorSchema,
    404: feedbackErrorSchema,
    409: feedbackErrorSchema,
    500: feedbackErrorSchema,
  };

  server.get(
    "/drafts",
    { schema: { response: { 200: feedbackDraftsResponseSchema, ...errors } } },
    getFeedbackDraftsHandler,
  );

  server.get(
    "/",
    { schema: { response: { 200: feedbackOverviewSchema, ...errors } } },
    getFeedbackOverviewHandler,
  );

  server.post(
    "/setup",
    {
      schema: {
        body: setupFeedbackBodySchema,
        response: { 200: feedbackOverviewSchema, ...errors },
      },
    },
    setupFeedbackHandler,
  );

  server.put(
    "/",
    {
      schema: {
        body: updateFeedbackSettingSchema,
        response: { 200: feedbackOverviewSchema, ...errors },
      },
    },
    updateFeedbackSettingHandler,
  );

  server.post(
    "/submit",
    { schema: { response: { 200: feedbackOverviewSchema, ...errors } } },
    submitFeedbackFlowHandler,
  );

  server.post("/reset", { schema: { response: errors } }, resetFeedbackHandler);

  server.get(
    "/results",
    {
      schema: {
        querystring: feedbackResultsQuerySchema,
        response: { 200: feedbackResultsSchema, ...errors },
      },
    },
    getFeedbackResultsHandler,
  );

  server.get(
    "/requests",
    {
      schema: {
        querystring: feedbackRequestsQuerySchema,
        response: { 200: feedbackRequestsPageSchema, ...errors },
      },
    },
    listFeedbackRequestsHandler,
  );
}
