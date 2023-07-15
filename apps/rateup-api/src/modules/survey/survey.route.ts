import { FastifyInstance } from "fastify";
import {
  cloneSurveyHandler,
  createSurveyHandler,
  deleteSurveyByIdHandler,
  getSurveyByIdHandler,
  getSurveyByTeamHandler,
  getSurveysHandler,
  updateSurveyByIdHandler,
  updateSurveyPasswordHandler,
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

  //duplicate survey
  server.post(
    "/clone/:id",
    {
      preHandler: verifySurveyAccess,
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    cloneSurveyHandler
  );


  interface GetSurveyByTeamParams {
    id: string;
  }
  // get survey by team id
  server.get<{ Params: GetSurveyByTeamParams }>(
    "/team/:id",
    {
      preHandler: [verifySession()],
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    getSurveyByTeamHandler
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

  server.put(
    "/password-update/:id",
    {
      preHandler: verifySurveyAccess,
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
        body: $Sref("updateSurveyPasswordRequestSchema"),
      }
    },
    updateSurveyPasswordHandler
  )
}


