import { FastifyInstance } from "fastify";
import {
  getFullMenuByIdHandler,
  getMenuByIdHandler,
  visitedMenuLandingHandler,
} from "./menu.controller.js";
import { ByMenuIdParamsSchema } from "./menu.schema.js";

export async function menuPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:menuId",
    {
      schema: {
        params: ByMenuIdParamsSchema,
      },
    },
    getMenuByIdHandler,
  );
  server.get(
    "/full/:menuId",
    {
      schema: {
        params: ByMenuIdParamsSchema,
      },
    },
    getFullMenuByIdHandler,
  );
  server.post(
    "/:menuId/visited",
    {
      schema: {
        params: ByMenuIdParamsSchema,
      },
    },
    visitedMenuLandingHandler,
  );
}
