import type { FastifyInstance } from "fastify";

import { externalErrorResponses } from "../../shared/errors.js";
import { paginationQuerySchema } from "../pagination.js";
import { declareExternalScopes } from "../../shared/scopes.js";
import * as C from "./surveys.controller.js";
import * as S from "./surveys.schema.js";

export async function externalSurveyRoutes(server: FastifyInstance) {
  const TAG = ["Surveys"];
  declareExternalScopes(server, { read: "surveys.read", write: "surveys.manage" });

  server.get(
    "/",
    {
      schema: {
        tags: TAG,
        summary: "List surveys",
        description: "Web, WhatsApp and WhatsApp Flow surveys, newest first.",
        querystring: S.surveyListQuerySchema,
        response: { 200: S.surveyListSchema, ...externalErrorResponses },
      },
    },
    C.listSurveysHandler,
  );

  server.get(
    "/:surveyId",
    {
      schema: {
        tags: TAG,
        summary: "Get a survey",
        description: "The survey and its questions, for labelling responses.",
        params: S.surveyIdParamsSchema,
        response: { 200: S.surveyDetailSchema, ...externalErrorResponses },
      },
    },
    C.getSurveyHandler,
  );

  server.get(
    "/:surveyId/responses",
    {
      schema: {
        tags: TAG,
        summary: "List a survey's responses",
        description: "Newest first, across every team the survey is shared with.",
        params: S.surveyIdParamsSchema,
        querystring: paginationQuerySchema,
        response: { 200: S.surveyResponseListSchema, ...externalErrorResponses },
      },
    },
    C.listSurveyResponsesHandler,
  );
}
