import { FastifyInstance } from "fastify";
import {
  getMenuBannerHandler,
} from "./banner.controller";
import { $Mref } from "../menu.schema";

export async function menuBannerPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
    },
    getMenuBannerHandler
  );
}
