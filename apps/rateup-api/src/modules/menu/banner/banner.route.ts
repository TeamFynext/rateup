import { FastifyInstance } from "fastify";
import {
  createMenuBannerHandler,
  deleteMenuBannerHandler,
  updateMenuBannerHandler,
} from "./banner.controller";
import { checkSession } from "../../../utils/checkSession";

import { $MBref } from "./banner.schema";
import { SubscriptionFeatureName } from "../../../types/enums";
import { getVerifySubscriptionHandler } from "../../../utils/auth";

export async function menuBannerRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", getVerifySubscriptionHandler([SubscriptionFeatureName.Menu]));

  server.post("/", createMenuBannerHandler);
  server.put(
    "/:menuBannerId",
    {
      schema: {
        params: $MBref("ByMenuBannerIdParamsSchema"),
        body: $MBref("createMenuBannerInputSchema"),
      },
    },
    updateMenuBannerHandler
  );
  server.delete(
    "/:menuBannerId",
    {
      schema: {
        params: $MBref("ByMenuBannerIdParamsSchema"),
      },
    },
    deleteMenuBannerHandler
  );
}
