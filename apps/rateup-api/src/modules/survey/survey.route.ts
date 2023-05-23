import { FastifyInstance } from "fastify";
import {
  createSurveyHandler,
  deleteSurveyByIdHandler,
  getSurveyByIdHandler,
  getSurveysHandler,
  updateSurveyByIdHandler,
} from "./survey.controller";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { $Sref } from "./survey.schema";
import { verifySurveyAccess, verifySurveyCreateAccess } from "./survey.auth";

export async function surveyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", verifySession());

  // create survey
  server.post(
    "/",
    {
      preHandler: verifySurveyCreateAccess,
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
      preHandler: verifySurveyAccess,
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
      preHandler: verifySurveyAccess,
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    deleteSurveyByIdHandler
  );

  // update survey by id
  server.put(
    "/:id",
    {
      preHandler: verifySurveyAccess,
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
        body: $Sref("updateSurveyRequestSchema"),
      }
    },
    updateSurveyByIdHandler

  )
}
