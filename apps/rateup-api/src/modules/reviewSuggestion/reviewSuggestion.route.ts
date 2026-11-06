import { FastifyInstance } from "fastify";
import {
  createReviewSuggestionsSchema,
  byReviewSuggestionIdSchema,
  publicReviewsQuerySchema,
  updateReviewSuggestionSchema,
} from "./reviewSuggestion.schema.js";
import {
  createReviewSuggestionsHandler,
  deleteReviewSuggestionHandler,
  errorHandler,
  getReviewsBySurveyTeamMapIdHandler,
  getReviewsByTeamIdHandler,
  getReviewsSuggestionCountByTeamIdHandler,
  updateReviewSuggestionHandler,
} from "./reviewSuggestion.controller.js";
import { checkSession } from "../../utils/checkSession.js";
import { rateLimit } from "../../utils/rateLimit.js";
import { verifyTeamAccess } from "../team/team.auth.js";
import {
  bySurveyTeamMapIdParamsSchema,
  byTeamIdParamsSchema,
  ByTeamIdParams,
} from "../team/team.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function reviewSuggestionRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  server.setErrorHandler(errorHandler);
  server.get<{ Params: ByTeamIdParams }>(
    "/:teamId",
    {
      preHandler: [checkSession, verifyTeamAccess],
      schema: {
        params: byTeamIdParamsSchema,
      },
    },
    getReviewsByTeamIdHandler,
  );
  server.get<{
    Params: { surveyTeamMapId: string };
    Querystring: { language?: string };
  }>(
    "/public/:surveyTeamMapId",
    {
      config: { access: "public" },
      preHandler: rateLimit({ max: 120, windowSeconds: 3600, key: "reviewSuggestionPublic" }),
      schema: {
        params: bySurveyTeamMapIdParamsSchema,
        querystring: publicReviewsQuerySchema,
      },
    },
    getReviewsBySurveyTeamMapIdHandler,
  );
  server.get<{ Params: ByTeamIdParams }>(
    "/:teamId/count",
    {
      preHandler: [checkSession, verifyTeamAccess],
      schema: {
        params: byTeamIdParamsSchema,
      },
    },
    getReviewsSuggestionCountByTeamIdHandler,
  );
  server.post<{ Params: ByTeamIdParams; Body: createReviewSuggestionsSchema }>(
    "/:teamId",
    {
      preHandler: [checkSession, verifyTeamAccess],
      schema: {
        params: byTeamIdParamsSchema,
        body: createReviewSuggestionsSchema,
      },
    },
    createReviewSuggestionsHandler,
  );
  server.put<{ Params: byReviewSuggestionIdSchema; Body: updateReviewSuggestionSchema }>(
    "/:reviewSuggestionId",
    {
      preHandler: [checkSession],
      schema: {
        params: byReviewSuggestionIdSchema,
        body: updateReviewSuggestionSchema,
      },
    },
    updateReviewSuggestionHandler,
  );
  server.delete<{ Params: byReviewSuggestionIdSchema }>(
    "/:reviewSuggestionId",
    {
      preHandler: [checkSession],
      schema: {
        params: byReviewSuggestionIdSchema,
      },
    },
    deleteReviewSuggestionHandler,
  );
}
