import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  createNewTheme,
  deleteTheme,
  errorHandler,
  getAllThemesOfUserOrg,
  getSurveyThemeByIdHandler,
  updateSurveyThemeHandler,
} from "./surveyTheme.controller";

export async function surveyThemeRoutes(server: FastifyInstance) {
  server.setErrorHandler(errorHandler);

  server.get("/:webSurveyThemeId", getSurveyThemeByIdHandler);
  server.get("/", { preHandler: checkSession }, getAllThemesOfUserOrg);

  server.post("/", { preHandler: checkSession }, createNewTheme);

  server.put(
    "/:webSurveyThemeId",
    { preHandler: checkSession },
    updateSurveyThemeHandler,
  );

  server.delete(
    "/:webSurveyThemeId",
    { preHandler: checkSession },
    deleteTheme,
  );
}
