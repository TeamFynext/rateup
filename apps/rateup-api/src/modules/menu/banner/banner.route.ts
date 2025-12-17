import { FastifyInstance } from "fastify";
import {
  createMenuBannerHandler,
  deleteMenuBannerHandler,
  updateMenuBannerHandler,
} from "./banner.controller.js";
import { checkSession } from "../../../utils/checkSession.js";

import { $MBref } from "./banner.schema.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";

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
