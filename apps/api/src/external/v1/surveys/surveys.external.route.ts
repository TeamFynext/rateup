import { FastifyInstance } from "fastify";
import {
  getSurveyListExternalController,
  getSurveyResponsesExternalController,
} from "./surveys.external.controller.js";
import { campaignResponseByIdSchema } from "../../../modules/campaigns/campaign.schema.js";
import {
  getResponsesBySurveyParamsSchema,
  getSurveyListResponseSchema,
} from "./surveys.external.schema.js";
import { declareExternalScopes } from "../../shared/scopes.js";

export async function externalSurveyRoutes(server: FastifyInstance) {
  declareExternalScopes(server, { read: "surveys.read", write: "surveys.manage" });

  server.get(
    "/:surveyId",
    {
      schema: {
        tags: ["Surveys/Responses"],
        description: "Get all survey responses by id",
        summary: "Get all survey responses by id",
        params: getResponsesBySurveyParamsSchema,
        response: {
          200: campaignResponseByIdSchema.array(),
        },
      },
    },
    getSurveyResponsesExternalController,
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["Surveys/List"],
        description: "Get all survey and whatsapp flows",
        summary: "Get all survey and whatsapp flows",
        response: {
          200: getSurveyListResponseSchema.array(),
        },
      },
    },
    getSurveyListExternalController,
  );
}
