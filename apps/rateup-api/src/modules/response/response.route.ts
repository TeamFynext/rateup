import { FastifyInstance } from "fastify";
import { $Rref } from "./response.schema";
import { getResponsesHandler } from "./response.controller";
import { verifyAccess } from "./response.auth";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";

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
}