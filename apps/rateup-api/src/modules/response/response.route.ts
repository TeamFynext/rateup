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
  SummarizeInput,
} from "./response.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function responseRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
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
      config: { permission: "responses.manage" },
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
      config: { permission: "responses.manage" },
      schema: {
        params: deleteResponseParamsSchema,
      },
    },
    deleteResponseHandler,
  );

  server.post<{ Params: { surveyId: string } }>(
    "/:surveyId/sync-response",
    {
      config: { permission: "responses.manage" },
    },
    syncResponseToGoogleSheetHandler,
  );

  server.post<{ Params: GetResponsesParams }>(
    "/export-contacts/:surveyId",
    {
      config: { permission: "contacts.export" },
    },
    exportContactResponseToContactsHandler,
  );

  server.post<{ Params: GetResponsesParams; Body: SummarizeInput }>(
    "/summarize/:surveyId",
    {
      config: { permission: "responses.manage" },
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
