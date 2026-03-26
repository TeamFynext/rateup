import { FastifyInstance } from "fastify";
import {
  createReviewSuggestionsSchema,
  byReviewSuggestionIdSchema,
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
} from "../team/team.schema.js";

export async function reviewSuggestionRoutes(server: FastifyInstance) {
  server.setErrorHandler(errorHandler);
  server.get(
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
  server.get(
    "/:teamId/count",
    {
      preHandler: [checkSession, verifyTeamAccess],
      schema: {
        params: byTeamIdParamsSchema,
      },
    },
    getReviewsSuggestionCountByTeamIdHandler,
  );
  server.post(
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
  server.put(
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
