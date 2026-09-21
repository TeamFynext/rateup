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
} from "./surveyTheme.controller.js";
import { CustomRouteShortHandOptions } from "../../types/global.js";
import {
  createThemeBodySchema,
  renameThemeBodySchema,
  themeIdParamsSchema,
  updateActiveThemeBodySchema,
} from "./surveyTheme.schema.js";
import { declareAccess } from "../../authz/registry.js";

const publicRouteOptions: CustomRouteShortHandOptions = {
  config: {
    isPublic: true,
  },
};

export async function surveyThemeRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  server.addHook("onRoute", (routeOptions) => {
    const declared = Array.isArray(routeOptions.preHandler)
      ? routeOptions.preHandler
      : routeOptions.preHandler
        ? [routeOptions.preHandler]
        : [];
    if (routeOptions.config && routeOptions.config["isPublic"]) {
      routeOptions.preHandler = declared;
      return;
    }
    routeOptions.preHandler = [checkSession, ...declared];
  });

  server.setErrorHandler(errorHandler);

  server.get(
    "/:webSurveyThemeId",
    { ...publicRouteOptions, schema: { params: themeIdParamsSchema } },
    getSurveyThemeByIdHandler,
  );

  server.get("/", getAllThemesOfUserOrg);

  server.post("/", { schema: { body: createThemeBodySchema } }, createNewTheme);

  server.put(
    "/:webSurveyThemeId",
    { schema: { params: themeIdParamsSchema, body: updateActiveThemeBodySchema } },
    updateSurveyThemeHandler,
  );

  server.patch(
    "/:webSurveyThemeId",
    { schema: { params: themeIdParamsSchema, body: renameThemeBodySchema } },
    renameTheme,
  );

  server.delete("/:webSurveyThemeId", { schema: { params: themeIdParamsSchema } }, deleteTheme);
}
