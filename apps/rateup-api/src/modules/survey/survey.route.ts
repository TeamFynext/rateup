import { FastifyInstance } from "fastify";
import {
  createSurveyHandler,
  deleteSurveyByIdHandler,
  getSurveyByIdHandler,
  getSurveysHandler,
} from "./survey.controller";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { $Sref } from "./survey.schema";
export async function surveyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", verifySession());

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

  // get all surveys from user
  server.get("/", getSurveysHandler);

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
