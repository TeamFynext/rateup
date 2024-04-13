import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import {
  createNewTheme,
  deleteTheme,
  errorHandler,
  getAllThemesOfUserOrg,
  getSurveyThemeByIdHandler,
  updateSurveyThemeHandler,
  renameTheme,
} from "./surveyTheme.controller";
import { CustomRouteShortHandOptions } from "../../types/global";

const publicRouteOptions: CustomRouteShortHandOptions = {
  config: {
    isPublic: true,
  },
};

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
    publicRouteOptions,
    getSurveyThemeByIdHandler,
  );

  server.get("/", getAllThemesOfUserOrg);

  server.post("/", createNewTheme);

  server.put("/:webSurveyThemeId", updateSurveyThemeHandler);

  server.patch("/:webSurveyThemeId", renameTheme);

  server.delete("/:webSurveyThemeId", deleteTheme);
}
