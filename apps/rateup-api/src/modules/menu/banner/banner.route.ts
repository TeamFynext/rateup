import { FastifyInstance } from "fastify";
import {
  createMenuBannerHandler,
  deleteMenuBannerHandler,
  updateMenuBannerHandler,
} from "./banner.controller";
import { checkSession } from "../../../utils/checkSession";

import { $MBref } from "./banner.schema";
import { getVerifySubscriptionHandler } from "../../../utils/auth";
import { SubscriptionFeaturePathName } from "../../../types/enums";

export async function menuBannerRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Menu]),
  );

  server.post("/", createMenuBannerHandler);
  server.put(
    "/:menuBannerId",
    {
      schema: {
        params: $MBref("ByMenuBannerIdParamsSchema"),
        body: $MBref("createMenuBannerInputSchema"),
      },
    },
    updateMenuBannerHandler,
  );
  server.delete(
    "/:menuBannerId",
    {
      schema: {
        params: $MBref("ByMenuBannerIdParamsSchema"),
      },
    },
    deleteMenuBannerHandler,
  );
}
