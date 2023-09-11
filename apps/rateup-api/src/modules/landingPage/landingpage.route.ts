import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { $Sref } from "./landingpage.schema";
import { deleteSurveyByIdHandler } from "../survey/survey.controller";
import { deleteSLandingPageByIdHandler, updateLandingPageByIdHandler } from "./landingpage.controller";

export async function LandingPageRoutes(server: FastifyInstance) {
    server.addHook("preHandler", verifySession());
  // -----delete landing page by id ---------
  server.delete(
    "/:id",
    {
      preHandler:[verifySession()],
      schema: {
        params: $Sref("getLandingPageByIdParamsSchema"),
      },
    },
    deleteSLandingPageByIdHandler
  );

  server.put(
    "/update/:id",
    {
      preHandler:[verifySession()],
      schema: {
        params: $Sref("getLandingPageByIdParamsSchema"),
        body: $Sref("updateLandingPageRequestSchema"),
      },
    },
    updateLandingPageByIdHandler
  );
}
