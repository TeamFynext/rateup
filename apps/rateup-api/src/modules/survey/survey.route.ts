import { FastifyInstance } from "fastify";
import {
  createSurveyHandler,
  deleteSurveyByIdHandler,
  getSurveyByIdHandler,
} from "./survey.controller";
import { $Sref } from "./survey.schema";
export async function surveyRoutes(server: FastifyInstance) {
  // create survey
  server.post(
    "/",
    {
      schema: {
        body: $Sref("createSurveyRequestSchema"),
        response: {
          201: $Sref("createSurveyResponseSchema"),
        },
      },
    },
    createSurveyHandler
  );

  // get survey by id
  server.get(
    "/:id",
    {
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    getSurveyByIdHandler
  );

  // delete survey by id
  server.delete(
    "/:id",
    {
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    deleteSurveyByIdHandler
  );
}
