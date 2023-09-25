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
  getWhatsappSurveysHandler,
  updateGoogleLinkHandler,
  createSurveyLandingHandler,
  getSurveysLandingHandler,
  getSurveyBylandingIdhandler,
  getLandingPageByIdHandler,
  updateSurveyLandingHandler,
  getActiveSurveysSummaryHandler,
  getWebSurveysHandler,
} from "./survey.controller";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { $Sref } from "./survey.schema";
import { verifySurveyAccess, verifySurveyCreateAccess } from "./survey.auth";
import { getWebSurveysByUserId } from "./survey.service";

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
  // ----------create survey landing page ---------
  server.post(
    "/createlanding",
    {
      preHandler: [verifySession()],
      schema: {
        body: $Sref("createSurveyLandingRequestSchema"),
        response: {
          201: $Sref("createSurveyLandingResponseSchema"),
        },
      },
    },
    createSurveyLandingHandler
  );
  // ----------create survey landing page ---------
  server.post(
    "/updatelanding/:id",
    {
      preHandler: [verifySession()],
      schema: {
        body: $Sref("createSurveyLandingRequestSchema"),
        response: {
          201: $Sref("createSurveyLandingResponseSchema"),
        },
      },
    },
    updateSurveyLandingHandler
  );

  // get all surveys from user
  server.get("/", getSurveysHandler);

  // get all web  surveys from user
  server.get("/web", getWebSurveysHandler);

  // get all active surveys summary from user
  server.get("/summary/active", getActiveSurveysSummaryHandler);

  // get all surveys from user
  server.get("/surveylandings", getSurveysLandingHandler);

  // get all whatsappsurveys from user
  server.get("/whatsappsurveys", getWhatsappSurveysHandler);

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
  // get landingpage by id
  server.get(
    "/landingpage/:id",
    {
      //----------to do ------verify access to landingpage session
      preHandler: [verifySession()],
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    getLandingPageByIdHandler
  );
  // get survey by landingid
  server.get(
    "/landingsurveys/:id",
    {
      preHandler: [verifySession()],
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    getSurveyBylandingIdhandler
  );

  //duplicate survey
  server.post(
    "/clone/:id",
    {
      preHandler: verifySurveyAccess,
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
        body: $Sref("cloneSurveySchema"),
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
      },
    },
    updateSurveyByIdHandler
  );

  server.put(
    "/password-update/:id",
    {
      preHandler: verifySurveyAccess,
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
        body: $Sref("updateSurveyPasswordRequestSchema"),
      },
    },
    updateSurveyPasswordHandler
  );

  server.put(
    "/googlelink-update/:id",
    {
      preHandler: verifySurveyAccess,
      schema: {
        params: $Sref("idParamsSchema"),
        body: $Sref("updateGoogleLinkRequestSchema"),
      },
    },
    updateGoogleLinkHandler
  );
}
