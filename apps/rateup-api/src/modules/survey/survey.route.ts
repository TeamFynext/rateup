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
  getSurveysLandingHandler,
  getActiveSurveysSummaryHandler,
  getWebSurveysHandler,
  deleteTeamSurveyHandler,
  getSurveyStatsBySurveyTeamMapIdHandler,
  getSurveyTemplatesHandler,
  getSurveysWithQuestionsHandler,
  getSurveysSummaryHandler,
  createSurveyVariableHandler,
  getSurveyVariablesHandler,
  updateSurveyVariableHandler,
  deleteSurveyVariableHandler,
  getSurveyResponseCountForGraphHandler,
  getSurveyStatsHandler,
  getNPSGraphHandler,
} from "./survey.controller.js";
import { $Sref } from "./survey.schema.js";
import {
  verifySurveyMaxCountRestriction,
  verifySurveyAccess,
  verifySurveyCreateAccess,
} from "./survey.auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { $Rref } from "../response/response.schema.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";

export async function surveyRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.WebSurvey]),
  );

  // create survey
  server.post(
    "/",
    {
      preHandler: [verifySurveyCreateAccess, verifySurveyMaxCountRestriction],
      schema: {
        body: $Sref("createSurveyRequestSchema"),
      },
    },
    createSurveyHandler,
  );
  // get all surveys from user
  server.get("/", getSurveysHandler);

  //get All Surveys with questions
  server.get("/all/survey-with-questions", getSurveysWithQuestionsHandler);
  // get all web  surveys from user
  server.get("/web", getWebSurveysHandler);

  // get all active surveys summary from user
  server.get("/summary/active", getActiveSurveysSummaryHandler);

  //get survey response for graph
  server.get("/summary/response", getSurveyResponseCountForGraphHandler);

  server.get("/summary/response/nps", getNPSGraphHandler);

  // get all surveys summary from user
  server.get("/summary/all", getSurveysSummaryHandler);

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
    getSurveyByIdHandler,
  );

  //get all survey templates
  server.get(
    "/templates/:surveyType",
    {
      schema: {
        params: $Sref("getSurveyTemplatesParamsSchema"),
      },
    },
    getSurveyTemplatesHandler,
  );

  //duplicate survey
  server.post(
    "/clone/:id",
    {
      preHandler: [verifySurveyAccess, verifySurveyMaxCountRestriction],
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
        body: $Sref("cloneSurveySchema"),
      },
    },
    cloneSurveyHandler,
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
    getSurveyByTeamHandler,
  );
  // get surveyStats by surveyTeamMapId
  server.get(
    "/surveyStats/:surveyTeamMapId",
    {
      schema: {
        params: $Rref("getResponsesParamsSchema"),
      },
    },
    getSurveyStatsBySurveyTeamMapIdHandler,
  );

  server.get("/surveyStats/all/:surveyId", getSurveyStatsHandler);

  // delete survey by id
  server.delete(
    "/:id",
    {
      preHandler: verifySurveyAccess,
      schema: {
        params: $Sref("getSurveyByIdParamsSchema"),
      },
    },
    deleteSurveyByIdHandler,
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
    deleteTeamSurveyHandler,
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
    updateSurveyByIdHandler,
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
    updateSurveyPasswordHandler,
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
    updateGoogleLinkHandler,
  );

  server.post(
    "/survey-variables/:id",
    {
      schema: {
        params: $Sref("idParamsSchema"),
        body: $Sref("surveyVariableSchema"),
      },
    },
    createSurveyVariableHandler,
  );
  server.get(
    "/survey-variables/:id",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    getSurveyVariablesHandler,
  );

  server.put(
    "/survey-variables/:id",
    {
      schema: {
        params: $Sref("idParamsSchema"),
        body: $Sref("surveyVariableUpdateSchema"),
      },
    },
    updateSurveyVariableHandler,
  );

  server.delete(
    "/survey-variables/:id",
    {
      schema: {
        params: $Sref("idParamsSchema"),
      },
    },
    deleteSurveyVariableHandler,
  );
}
