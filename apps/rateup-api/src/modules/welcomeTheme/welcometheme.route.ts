import { FastifyInstance } from "fastify";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { $Sref } from "./welcometheme.schema";
import {
  createWelcomeThemeHandler,
  getWelcomeThemeByIdHandler,
  updateSurveyByIdHandler,
} from "./welcometheme.controller";

export async function WelcomeThemeRoutes(server: FastifyInstance) {
  server.addHook("preHandler", verifySession());
  server.post(
    "/create",
    {
      preHandler: [verifySession()],
      schema: {
        body: $Sref("createWelcomeThemeRequestSchema"),
        response: {
          201: $Sref("createWelcomeThemeResponseSchema"),
        },
      },
    },
    createWelcomeThemeHandler
  );

  //-----------get welcome theme by survey id ------------
  
  server.get(
    "/survey/:id",
    {
      preHandler: [verifySession()],
      schema: {
        params: $Sref("getWelcomeThemeBySurveyIdParamsSchema"),
      },
    },
    getWelcomeThemeByIdHandler
  );

  // ----------update welcome theme ---------
  server.post(
    "/update/:id",
    {
      preHandler: [verifySession()],
      schema: {
        body: $Sref("createWelcomeThemeResponseSchema"),
        response: {
          201: $Sref("createWelcomeThemeResponseSchema"),
        },
      },
    },
    updateSurveyByIdHandler
  );
}
