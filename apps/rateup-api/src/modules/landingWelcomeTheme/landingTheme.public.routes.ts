import { FastifyInstance } from "fastify";
import { $Sref } from "./landingTheme.schema";
import { getLandingThemeByIdHandler } from "./landingTheme.controller";

export async function LandingThemePublicRoutes(server: FastifyInstance) {
  // get survey by landingid
  server.get(
    "/landing/:id",
    {
      schema: {
        params: $Sref("getLandingThemeBySurveyIdParamsSchema"),
      },
    },
    getLandingThemeByIdHandler
  );
}
