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
  deleteTeamSurveyHandler,
  getSurveyStatsBySurveyTeamMapIdHandler,
  getSurveyTemplatesHandler,
} from "./survey.controller";
import { $Sref } from "./survey.schema";
import { verifySurveyMaxCountRestriction, verifySurveyAccess, verifySurveyCreateAccess } from "./survey.auth";
import { checkSession } from "../../utils/checkSession";
import { $Rref } from "../response/response.schema";
import { SubscriptionFeatureName } from "../../types/enums";
import {  getVerifySubscriptionHandler } from "../../utils/auth";

export async function surveyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", getVerifySubscriptionHandler([SubscriptionFeatureName.WebSurvey]));

  // create survey
  server.post(
    "/",
    {
      preHandler: [
        verifySurveyCreateAccess,
        verifySurveyMaxCountRestriction
      ],
      schema: {
        body: $Sref("createSurveyRequestSchema"),
      },
    },
    createSurveyHandler
  );
  // ----------create survey landing page ---------
  server.post(
    "/createlanding",
    {
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
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    getSurveyBylandingIdhandler
  );


  //get all survey templates
  server.get(
    "/templates/:surveyType",
    {
      schema: {
        params: $Sref("getSurveyTemplatesParamsSchema"),
      },
    },
    getSurveyTemplatesHandler
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
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    getSurveyByTeamHandler
  );
  // get surveyStats by surveyTeamMapId
  server.get(
    "/surveyStats/:surveyTeamMapId",
    {
      schema: {
        params: $Rref("getResponsesParamsSchema"),
      },
    },
    getSurveyStatsBySurveyTeamMapIdHandler
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

  // delete team survey by surveyId, teamId
  server.delete(
    "/teamsurvey/:id",
    {
      preHandler: verifySurveyAccess,
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
        body: $Sref("deleteTeamSurveyRequestSchema"),
      },
    },
    deleteTeamSurveyHandler
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
