import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  createNewTheme,
  deleteTheme,
  errorHandler,
  getAllThemesOfUserOrg,
  getSurveyThemeByIdHandler,
  updateSurveyThemeHandler,
  renameTheme,
  updateAllWebSurveyThemesJson,
} from "./surveyTheme.controller.js";
import { CustomRouteShortHandOptions } from "../../types/global.js";
import { assertRootOrg } from "../../utils/auth.js";

const publicRouteOptions: CustomRouteShortHandOptions = {
  config: {
    isPublic: true,
  },
};

const assertRootOrgRouteOptions: CustomRouteShortHandOptions = {
  config: {
    assertRootOrg: true,
  },
};

export async function surveyThemeRoutes(server: FastifyInstance) {
  server.addHook("onRoute", (routeOptions) => {
    if (routeOptions.config && routeOptions.config["isPublic"]) {
      routeOptions.preHandler = [];
      return;
    } else {
      routeOptions.preHandler = [checkSession];
      if (routeOptions.config && routeOptions.config["assertRootOrg"]) {
        routeOptions.preHandler.push(assertRootOrg);
      }
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

  server.post(
    "/updateWebSurveyThemes",
    assertRootOrgRouteOptions,
    updateAllWebSurveyThemesJson,
  );
}
