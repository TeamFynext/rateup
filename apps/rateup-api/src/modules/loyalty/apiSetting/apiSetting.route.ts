import { FastifyInstance } from "fastify";
import { $lApiSettingRef } from "./apiSetting.schema.js";
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
        params: $lApiSettingRef("byLApiSettingIdParamSchema"),
      },
    },
    getLoyaltyApiSettingByIdHandler,
  );

  server.post(
    "/",
    {
      schema: {
        body: $lApiSettingRef("LApiSettingSchema"),
      },
    },
    createLoyaltyApiSettingHandler,
  );

  server.put(
    "/:id",
    {
      schema: {
        params: $lApiSettingRef("byLApiSettingIdParamSchema"),
        body: $lApiSettingRef("updateApiSetting"),
      },
    },
    updateLoyaltyApiSettingHandler,
  );
}
