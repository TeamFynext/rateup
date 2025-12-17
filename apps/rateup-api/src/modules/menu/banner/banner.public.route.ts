import { FastifyInstance } from "fastify";
import { getMenuBannerHandler } from "./banner.controller.js";
import { $Mref } from "../menu.schema.js";

export async function menuBannerPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
    },
    getMenuBannerHandler,
  );
}
