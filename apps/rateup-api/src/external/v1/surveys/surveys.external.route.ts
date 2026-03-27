import { FastifyInstance } from "fastify";
import {
  getSurveyListExternalController,
  getSurveyResponsesExternalController,
} from "./surveys.external.controller.js";
import { campaignResponseByIdSchema } from "../../../modules/campaign/campaign.schema.js";
import {
  getResponsesBySurveyParamsSchema,
  getSurveyListResponseSchema,
} from "../../../modules/response/response.schema.js";

export async function externalSurveyRoutes(server: FastifyInstance) {
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
