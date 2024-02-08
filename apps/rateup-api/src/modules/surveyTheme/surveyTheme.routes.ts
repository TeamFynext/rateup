import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import { $surveyThemeRef } from "./surveyTheme.schema";
import {
  errorHandler,
  getSurveyThemeBySurveyIdHandler,
  updateSurveyThemeHandler,
} from "./surveyTheme.controller";

export async function surveyThemeRoutes(server: FastifyInstance) {
  server.setErrorHandler(errorHandler);
  server.get(
    "/:surveyId",
    {
      schema: {
        params: $surveyThemeRef("bySurveyIdSchema"),
      },
    },
    getSurveyThemeBySurveyIdHandler,
  );
  server.put(
    "/:surveyThemeId",
    {
      preHandler: checkSession,
      schema: {
        params: $surveyThemeRef("bySurveyThemeIdSchema"),
        body: $surveyThemeRef("surveyThemeSchemaCore"),
      },
    },
    updateSurveyThemeHandler,
  );
}
