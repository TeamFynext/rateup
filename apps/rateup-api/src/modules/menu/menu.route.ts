import { FastifyInstance } from "fastify";
import {
  createMenuHandler,
  deleteMenuHandler,
  getAllMenusByTeamIdHandler,
  getAllMenusHandler,
  getFullMenuByIdHandler,
  getMenuByIdHandler,
  getMenuLandingHandler,
  updateMenuHandler,
} from "./menu.controller.js";
import { verifyTeamAccess } from "../team/team.auth.js";
import {
  verifyMenuAccess,
  verifyMenuMaxCountRestriction,
} from "./menu.auth.js";
import { checkSession } from "../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import {
  ByMenuIdParamsSchema,
  menuInputSchema,
  updateMenuInputSchema,
} from "./menu.schema.js";
import { byTeamIdParamsSchema } from "../team/team.schema.js";

export async function menuRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Menu]),
  );
  server.post(
    "/",
    {
      schema: {
        body: menuInputSchema,
      },
      preHandler: verifyMenuMaxCountRestriction,
    },
    createMenuHandler,
  );

  server.get("/all", getAllMenusHandler);

  server.get(
    "/all/:teamId",
    {
      schema: {
        params: byTeamIdParamsSchema,
      },
      preHandler: verifyTeamAccess,
    },
    getAllMenusByTeamIdHandler,
  );

  server.get(
    "/:menuId",
    {
      schema: {
        params: ByMenuIdParamsSchema,
      },
      preHandler: verifyMenuAccess,
    },
    getMenuByIdHandler,
  );

  server.get(
    "/full/:menuId",
    {
      schema: {
        params: ByMenuIdParamsSchema,
      },
      preHandler: verifyMenuAccess,
    },
    getFullMenuByIdHandler,
  );

  server.put(
    "/:menuId",
    {
      schema: {
        body: updateMenuInputSchema,
        params: ByMenuIdParamsSchema,
      },
      preHandler: verifyMenuAccess,
    },
    updateMenuHandler,
  );
  server.delete(
    "/:menuId",
    {
      schema: {
        params: ByMenuIdParamsSchema,
      },
      preHandler: verifyMenuAccess,
    },
    deleteMenuHandler,
  );
  server.get(
    "/getLanding/:menuId",
    {
      schema: {
        params: ByMenuIdParamsSchema,
      },
      preHandler: verifyMenuAccess,
    },
    getMenuLandingHandler,
  );
}
