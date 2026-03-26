import { FastifyInstance } from "fastify";
import { getMenuBannerHandler } from "./banner.controller.js";
import { ByMenuIdParamsSchema } from "../menu.schema.js";

export async function menuBannerPublicRoutes(server: FastifyInstance) {
  server.get(
    "/:menuId",
    {
      schema: {
        params: ByMenuIdParamsSchema,
      },
    },
    getMenuBannerHandler,
  );
}
