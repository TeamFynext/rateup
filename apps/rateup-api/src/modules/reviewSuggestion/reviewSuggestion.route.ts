import { FastifyInstance } from "fastify";
import { $reviewSuggestionRef } from "./reviewSuggestion.schema.js";
import { $Tref } from "../team/team.schema.js";
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

export async function reviewSuggestionRoutes(server: FastifyInstance) {
  server.setErrorHandler(errorHandler);
  server.get(
    "/:teamId",
    {
      preHandler: [checkSession, verifyTeamAccess],
      schema: {
        params: $Tref("byTeamIdParamsSchema"),
      },
    },
    getReviewsByTeamIdHandler,
  );
  server.get(
    "/public/:surveyTeamMapId",
    {
      schema: {
        params: $Tref("bySurveyTeamMapIdParamsSchema"),
      },
    },
    getReviewsBySurveyTeamMapIdHandler,
  );
  server.get(
    "/:teamId/count",
    {
      preHandler: [checkSession, verifyTeamAccess],
      schema: {
        params: $Tref("byTeamIdParamsSchema"),
      },
    },
    getReviewsSuggestionCountByTeamIdHandler,
  );
  server.post(
    "/:teamId",
    {
      preHandler: [checkSession, verifyTeamAccess],
      schema: {
        params: $Tref("byTeamIdParamsSchema"),
        body: $reviewSuggestionRef("createReviewSuggestionsSchema"),
      },
    },
    createReviewSuggestionsHandler,
  );
  server.put(
    "/:reviewSuggestionId",
    {
      preHandler: [checkSession],
      schema: {
        params: $reviewSuggestionRef("byReviewSuggestionIdSchema"),
      },
    },
    updateReviewSuggestionHandler,
  );
  server.delete(
    "/:reviewSuggestionId",
    {
      schema: {
        params: $reviewSuggestionRef("byReviewSuggestionIdSchema"),
      },
    },
    deleteReviewSuggestionHandler,
  );
}
