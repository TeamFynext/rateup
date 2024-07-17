import { FastifyInstance } from "fastify";
import { $Mref } from "./menu.schema";
import {
  createMenuHandler,
  deleteMenuHandler,
  getAllMenusByTeamIdHandler,
  getAllMenusHandler,
  getFullMenuByIdHandler,
  getMenuByIdHandler,
  getMenuLandingHandler,
  updateMenuHandler,
} from "./menu.controller";
import { $Tref } from "../team/team.schema";
import { verifyTeamAccess } from "../team/team.auth";
import { verifyMenuAccess, verifyMenuMaxCountRestriction } from "./menu.auth";
import { checkSession } from "../../utils/checkSession";
import { getVerifySubscriptionHandler } from "../../utils/auth";
import { SubscriptionFeaturePathName } from "../../types/enums";

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
        body: $Mref("menuInputSchema"),
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
        params: $Tref("byTeamIdParamsSchema"),
      },
      preHandler: verifyTeamAccess,
    },
    getAllMenusByTeamIdHandler,
  );

  server.get(
    "/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    getMenuByIdHandler,
  );

  server.get(
    "/full/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    getFullMenuByIdHandler,
  );

  server.put(
    "/:menuId",
    {
      schema: {
        body: $Mref("updateMenuInputSchema"),
        params: $Mref("ByMenuIdParamsSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    updateMenuHandler,
  );
  server.delete(
    "/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    deleteMenuHandler,
  );
  server.get(
    "/getLanding/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    getMenuLandingHandler,
  );
}
