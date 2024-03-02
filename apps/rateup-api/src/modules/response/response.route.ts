import { FastifyInstance } from "fastify";
import { $Rref } from "./response.schema";
import {
  deleteResponseHandler,
  downloadExcelResponseHandler,
  generateResponseHandler,
  getAllResponsesHandler,
  getResponsesHandler,
  resetResponsesHandler,
  syncResponseToGoogleSheetHandler,
} from "./response.controller";
import { verifyAccess } from "./response.auth";
import { checkRoleHandler } from "../../utils/checkRoleHandler";
import { checkSession } from "../../utils/checkSession";
import { assertRootOrg } from "../../utils/auth";

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
}
