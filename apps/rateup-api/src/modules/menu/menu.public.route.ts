import { FastifyInstance } from "fastify";
import {
  getFullMenuByIdHandler,
  getMenuByIdHandler,
  visitedMenuLandingHandler,
} from "./menu.controller.js";
import { $Mref } from "./menu.schema.js";

export async function menuPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
    },
    getMenuByIdHandler,
  ),
    server.get(
      "/full/:menuId",
      {
        schema: {
          params: $Mref("ByMenuIdParamsSchema"),
          response: {
            200: $Mref("fullMenuPublicResponseSchema"),
          },
        },
      },
      getFullMenuByIdHandler,
    ),
    server.post(
      "/:menuId/visited",
      {
        schema: {
          params: $Mref("ByMenuIdParamsSchema"),
        },
      },
      visitedMenuLandingHandler,
    );
}
