import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { $Sref } from "./landingTheme.schema";
import {
  createLandingThemeHandler,
  getLandingThemeByIdHandler,
  updateSurveyByIdHandler,
} from "./landingTheme.controller";

export async function LandingThemeRoutes(server: FastifyInstance) {
  server.addHook("preHandler", verifySession());
  server.post(
    "/create",
    {
      preHandler: [verifySession()],
      schema: {
        body: $Sref("createLandingThemeRequestSchema"),
        response: {
          201: $Sref("createLandingThemeResponseSchema"),
        },
      },
    },
    createLandingThemeHandler
  );

  //-----------get welcome theme by survey id ------------
  
  server.get(
    "/landing/:id",
    {
      preHandler: [verifySession()],
      schema: {
        params: $Sref("getLandingThemeBySurveyIdParamsSchema"),
      },
    },
    getLandingThemeByIdHandler
  );

  // ----------update welcome theme ---------
  server.post(
    "/update/:id",
    {
      preHandler: [verifySession()],
      schema: {
        body: $Sref("createLandingThemeResponseSchema"),
        response: {
          201: $Sref("createLandingThemeResponseSchema"),
        },
      },
    },
    updateSurveyByIdHandler
  );
}
