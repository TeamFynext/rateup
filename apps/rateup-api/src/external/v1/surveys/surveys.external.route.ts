import { FastifyInstance } from "fastify";
import {
  getSurveyListExternalController,
  getSurveyResponsesExternalController,
} from "./surveys.external.controller.js";
import { $Rref } from "../../../modules/response/response.schema.js";
import { $campaignRef } from "../../../modules/campaign/campaign.schema.js";

export async function externalSurveyRoutes(server: FastifyInstance) {
  server.get(
    "/:surveyId",
    {
      schema: {
        tags: ["Surveys/Responses"],
        description: "Get all survey responses by id",
        summary: "Get all survey responses by id",
        params: $Rref("getResponsesBySurveyParamsSchema"),
        response: {
          200: {
            type: "array",
            items: $campaignRef("campaignResponseByIdSchema"),
          },
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
          200: {
            type: "array",
            items: $Rref("getSurveyListResponseSchema"),
          },
        },
      },
    },
    getSurveyListExternalController,
  );
}
