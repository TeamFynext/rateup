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

const publicRouteOptions: CustomRouteShortHandOptions = {
  config: {
    isPublic: true,
  },
};

export async function surveyThemeRoutes(server: FastifyInstance) {
  server.addHook("onRoute", (routeOptions) => {
    // The hook used to ASSIGN rather than append, so any preHandler a route
    // declared for itself was silently discarded. Nothing in this file declares
    // one today, but this hook is what the whole module's authentication rests
    // on and the next person to add one would find it removed without a warning.
    // See issues.txt 33.5.
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

  // REMOVED: POST /updateWebSurveyThemes — a root-org endpoint that claimed to
  // migrate every theme in the database and was a no-op reporting success, whose
  // one real statement had been commented out. Re-enabling it would have read
  // every row and rewritten it in one unbatched transaction, aborting on the
  // first row seeded from the current defaultTheme. See issues.txt 33.6.
}
