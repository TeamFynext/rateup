import { FastifyInstance } from "fastify";
import { $Rref } from "./response.schema";
import { deleteResponseHandler, getResponsesHandler, resetResponsesHandler } from "./response.controller";
import { verifyAccess } from "./response.auth";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { checkRoleHandler } from "../../utils/checkRoleHandler";
import { checkRoleHandler } from "../../utils/checkRoleHandler";

export async function responseRoutes(server: FastifyInstance) {
  server.addHook("preHandler", verifySession());
  server.addHook("preHandler", verifyAccess);
  server.get(
    "/:surveyId",
    {
      // TODO: verifySurveyAccess
      schema: {
        params: $Rref("getResponsesParamsSchema"),
      },
    },
    getResponsesHandler
  );

  //to reset survey responses & stats
  server.delete(  
    "/reset/:surveyId",
    {
      preHandler: [ checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
      schema: {
        params: $Rref("getResponsesParamsSchema"),
      },
    },
    resetResponsesHandler
  );


    //to delete single response
    server.delete(  
      "/:surveyId/delete/:id",
      {
        preHandler: [ checkRoleHandler(["SUPER_ADMIN", "ADMIN"])],
        schema: {
          params: $Rref("deleteResponseParamsSchema"),
        },
      },
      deleteResponseHandler
    );
}