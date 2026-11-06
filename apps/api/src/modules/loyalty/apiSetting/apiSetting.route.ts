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
import { declareAccess } from "../../../authz/registry.js";

export async function loyaltyApiSettingRoutes(server: FastifyInstance) {
  declareAccess(server, { write: "loyalty.api_settings" });
  server.get("/", { config: { permission: "loyalty.api_settings" } }, getLoyaltyApiSettingsHandler);

  server.get(
    "/:id",
    {
      config: { permission: "loyalty.api_settings" },
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
