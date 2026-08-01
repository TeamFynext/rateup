import { FastifyInstance } from "fastify";
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
import {
  deleteResponseParamsSchema,
  DeleteResponseParamsSchema,
  generateBodySchema,
  GenerateBodyInput,
  generateXlsxSchema,
  getResponsesParamsSchema,
  GetResponsesParams,
  responseFilterQuery,
  summarizeSchema,
} from "./response.schema.js";

export async function responseRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", verifyAccess);
  server.get(
    "/:surveyTeamMapId",
    {
      // TODO: verifySurveyAccess
      schema: {
        params: getResponsesParamsSchema,
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
        querystring: responseFilterQuery,
      },
    },
    getSurveyResponseBySurveyIdHandler,
  );

  server.get("/count/:surveyId", getSurveyResponseCountHandler);
  server.post(
    "/download-response",
    {
      schema: {
        body: generateXlsxSchema,
      },
    },
    downloadExcelResponseHandler,
  );

  //generate response data
  server.post<{ Body: GenerateBodyInput }>(
    "/generate",
    {
      preHandler: [assertRootOrg],
      schema: {
        body: generateBodySchema,
      },
    },
    generateResponseHandler,
  );

  //to reset survey responses & stats
  server.delete<{ Params: GetResponsesParams }>(
    "/reset/:surveyId",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        params: getResponsesParamsSchema,
      },
    },
    resetResponsesHandler,
  );

  //to delete single response
  server.delete<{ Params: DeleteResponseParamsSchema }>(
    "/:surveyTeamMapId/delete/:id",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        params: deleteResponseParamsSchema,
      },
    },
    deleteResponseHandler,
  );

  server.post<{ Params: { surveyId: string } }>(
    "/:surveyId/sync-response",
    {
      preHandler: [checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
    },
    syncResponseToGoogleSheetHandler,
  );

  server.post("/export-contacts/:surveyId", exportContactResponseToContactsHandler);

  server.post(
    "/summarize/:surveyId",
    {
      schema: {
        body: summarizeSchema,
      },
    },
    summarizeResponseHandler,
  );

  server.get("/analytics/:surveyId", getResponseAnalyticsForGraphHandler);
  server.get("/analytics/happyindex/:surveyId", getHappyIndexResponsesHandler);
  server.get("/comparison/:surveyId", getResponseCountForCamparisonHandler);
}
