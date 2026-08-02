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
  // Unauthenticated by design — respondents read this at the end of a survey —
  // but it was also unmetered, so a survey mapping id (which is in the survey's
  // own public URL) let anyone enumerate a team's whole suggestion set, in every
  // language, as often as they liked. The ids it returns are what made 36.1
  // straightforward. See issues.txt 36.5.
  server.get<{
    Params: { surveyTeamMapId: string };
    Querystring: { language?: string };
  }>(
    "/public/:surveyTeamMapId",
    {
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
        // The PUT declared no body schema, so the request body reached
        // prisma.update verbatim. See issues.txt 36.2.
        body: updateReviewSuggestionSchema,
      },
    },
    updateReviewSuggestionHandler,
  );
  // This carried no preHandler of any kind — not checkSession, not a team check
  // — while every other route in the file carried at least a session. It is a
  // destructive write, not a public read. See issues.txt 36.1.
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
