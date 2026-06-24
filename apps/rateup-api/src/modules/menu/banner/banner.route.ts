import { FastifyInstance } from "fastify";
import {
  createMenuBannerHandler,
  deleteMenuBannerHandler,
  updateMenuBannerHandler,
} from "./banner.controller.js";
import { checkSession } from "../../../utils/checkSession.js";

import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import { ByMenuBannerIdParamsSchema, createMenuBannerInputSchema } from "./banner.schema.js";

export async function menuBannerRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", getVerifySubscriptionHandler([SubscriptionFeaturePathName.Menu]));

  server.post("/", createMenuBannerHandler);
  server.put(
    "/:menuBannerId",
    {
      schema: {
        params: ByMenuBannerIdParamsSchema,
        body: createMenuBannerInputSchema,
      },
    },
    updateMenuBannerHandler,
  );
  server.delete(
    "/:menuBannerId",
    {
      schema: {
        params: ByMenuBannerIdParamsSchema,
      },
    },
    deleteMenuBannerHandler,
  );
}
