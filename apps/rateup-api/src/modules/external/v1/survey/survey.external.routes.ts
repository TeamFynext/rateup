import { FastifyInstance } from "fastify";
import {
  getResponsesBySurveyIdHandler,
  getSurveyListHandler,
} from "../../../response/response.controller.js";
import { $Rref } from "../../../response/response.schema.js";
import { $campaignRef } from "../../../campaign/campaign.schema.js";

export async function extSurveyRoutes(server: FastifyInstance) {
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
    getResponsesBySurveyIdHandler,
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
    getSurveyListHandler,
  );
}
