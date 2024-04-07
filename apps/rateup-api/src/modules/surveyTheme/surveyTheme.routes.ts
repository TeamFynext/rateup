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
  server.addHook("onRoute", (routeOptions) => {
    if (routeOptions.config && routeOptions.config["isPublic"] === true) {
      routeOptions.preHandler = [];
      return;
    } else {
      routeOptions.preHandler = [checkSession];
    }
  });

  server.setErrorHandler(errorHandler);

  server.get(
    "/:webSurveyThemeId",
    // @ts-ignore
    { config: { isPublic: true } },
    getSurveyThemeByIdHandler,
  );

  server.get("/", getAllThemesOfUserOrg);

  server.post("/", createNewTheme);

  server.put("/:webSurveyThemeId", updateSurveyThemeHandler);

  server.delete("/:webSurveyThemeId", deleteTheme);
}
