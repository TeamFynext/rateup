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
  updateLandingPageOptionHandler,
  updateMenuHandler,
  updateMenuLandingHandler,
} from "./menu.controller";
import { $Tref } from "../team/team.schema";
import { verifyTeamAccess } from "../team/team.auth";
import { verifyMenuAccess } from "./menu.auth";
import { checkSession } from "../../utils/checkSession";

export async function menuRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.post(
    "/",
    {
      schema: {
        body: $Mref("menuInputSchema"),
      },
    },
    createMenuHandler
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
    getAllMenusByTeamIdHandler
  );

  server.get(
    "/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    getMenuByIdHandler
  );

  server.get(
    "/full/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    getFullMenuByIdHandler
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
    updateMenuHandler
  );
  server.delete(
    "/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    deleteMenuHandler
  );
  server.get(
    "/getLanding/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    getMenuLandingHandler
  );
  server.put(
    "/updateLanding/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
        body: $Mref("updateMenuLandingInputSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    updateMenuLandingHandler
  );
  server.put(
    "/updateLandingPageOption/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
        body: $Mref("updateLandingPageOptionSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    updateLandingPageOptionHandler
  );
}
