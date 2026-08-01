import { FastifyInstance } from "fastify";
import {
  createReviewSuggestionsSchema,
  byReviewSuggestionIdSchema,
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
import { verifyTeamAccess } from "../team/team.auth.js";
import {
  bySurveyTeamMapIdParamsSchema,
  byTeamIdParamsSchema,
  ByTeamIdParams,
} from "../team/team.schema.js";

export async function reviewSuggestionRoutes(server: FastifyInstance) {
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
  server.get(
    "/public/:surveyTeamMapId",
    {
      schema: {
        params: bySurveyTeamMapIdParamsSchema,
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
      },
    },
    updateReviewSuggestionHandler,
  );
  server.delete(
    "/:reviewSuggestionId",
    {
      schema: {
        params: byReviewSuggestionIdSchema,
      },
    },
    deleteReviewSuggestionHandler,
  );
}
