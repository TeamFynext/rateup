import { FastifyInstance } from "fastify";
import { $Sref } from "./welcometheme.schema";
import { getWelcomeThemeByIdHandler } from "./welcometheme.controller";

export async function WelcomeThemePublicRoutes(server: FastifyInstance) {
  // get survey by landingid
  server.get(
    "/surveys/:id",
    {
      schema: {
        params: $Sref("getWelcomeThemeBySurveyIdParamsSchema"),
      },
    },
    getWelcomeThemeByIdHandler
  );
}
