import { FastifyInstance } from "fastify";
import { $Rref } from "./response.schema.js";
import {
  deleteResponseHandler,
  downloadExcelResponseHandler,
  exportContactResponseToContactsHandler,
  generateResponseHandler,
  getAllResponsesHandler,
  getResponseAnalyticsForGraphHandler,
  getResponseCountForCamparisonHandler,
  getResponsesHandler,
  getSurveyResponseBySurveyIdHandler,
  getSurveyResponseCountHandler,
  resetResponsesHandler,
  summarizeResponseHandler,
  syncResponseToGoogleSheetHandler,
  getHappyIndexResponsesHandler,
} from "./response.controller.js";
import { verifyAccess } from "./response.auth.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";
import { checkSession } from "../../utils/checkSession.js";
import { assertRootOrg } from "../../utils/auth.js";

export async function responseRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", verifyAccess);
  server.get(
    "/:surveyTeamMapId",
    {
      // TODO: verifySurveyAccess
      schema: {
        params: $Rref("getResponsesParamsSchema"),
      },
    },
    getResponsesHandler,
  );
  //route dedcicated for getting all responses for a survey including all teams
  server.get("/all/:surveyId", getAllResponsesHandler);

  server.get(
    "/survey/:surveyId",
    {
      schema: {
        querystring: $Rref("responseFilterQuery"),
      },
    },
    getSurveyResponseBySurveyIdHandler,
  );

  server.get("/count/:surveyId", getSurveyResponseCountHandler);
  server.post(
    "/download-response",
    {
      schema: {
        body: $Rref("generateXlsxSchema"),
      },
    },
    downloadExcelResponseHandler,
  );

  //generate response data
  server.post(
    "/generate",
    {
      preHandler: [assertRootOrg],
      schema: {
        body: $Rref("generateBodySchema"),
      },
    },
    generateResponseHandler,
  );

  //to reset survey responses & stats
  server.delete(
    "/reset/:surveyTeamMapId",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        params: $Rref("getResponsesParamsSchema"),
      },
    },
    resetResponsesHandler,
  );

  //to delete single response
  server.delete(
    "/:surveyTeamMapId/delete/:id",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        params: $Rref("deleteResponseParamsSchema"),
      },
    },
    deleteResponseHandler,
  );

  server.post(
    "/:surveyId/sync-response",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    syncResponseToGoogleSheetHandler,
  );

  server.post(
    "/export-contacts/:surveyId",
    exportContactResponseToContactsHandler,
  );

  server.post(
    "/summarize/:surveyId",
    {
      schema: {
        body: $Rref("summarizeSchema"),
      },
    },
    summarizeResponseHandler,
  );

  server.get("/analytics/:surveyId", getResponseAnalyticsForGraphHandler);
  server.get("/analytics/happyindex/:surveyId", getHappyIndexResponsesHandler);
  server.get("/comparison/:surveyId", getResponseCountForCamparisonHandler);
}
