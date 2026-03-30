import { FastifyInstance } from "fastify";
import {
  byLApiSettingIdParamSchema,
  LApiSettingSchema,
  updateApiSetting,
} from "./apiSetting.schema.js";
import {
  getLoyaltyApiSettingsHandler,
  getLoyaltyApiSettingByIdHandler,
  createLoyaltyApiSettingHandler,
  updateLoyaltyApiSettingHandler,
} from "./apiSetting.controller.js";

export async function loyaltyApiSettingRoutes(server: FastifyInstance) {
  server.get("/", getLoyaltyApiSettingsHandler);

  server.get(
    "/:id",
    {
      schema: {
        params: byLApiSettingIdParamSchema,
      },
    },
    getLoyaltyApiSettingByIdHandler,
  );

  server.post(
    "/",
    {
      schema: {
        body: LApiSettingSchema,
      },
    },
    createLoyaltyApiSettingHandler,
  );

  server.put(
    "/:id",
    {
      schema: {
        params: byLApiSettingIdParamSchema,
        body: updateApiSetting,
      },
    },
    updateLoyaltyApiSettingHandler,
  );
}
