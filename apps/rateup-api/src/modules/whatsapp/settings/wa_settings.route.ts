import { FastifyInstance } from "fastify";
import {
  createWaSettingsHandler,
  deleteWaSettingsHandler,
  getWaSettingsHandler,
  upsertWaSettingsHandler,
} from "./wa_settings.controller";
import { $WASettingsref } from "./wa_settings.schema";
import { checkSession } from "../../../utils/checkSession";

export async function waSettingsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get(
    "/",
    {
      schema: {
        response: {
          200: $WASettingsref("getWaSettingsResponseSchema"),
        },
      },
    },
    getWaSettingsHandler,
  );
  server.post(
    "/",
    {
      schema: {
        body: $WASettingsref("createWaSettingsInputSchema"),
      },
    },
    createWaSettingsHandler,
  );
  server.put(
    "/",
    {
      schema: {
        body: $WASettingsref("updateWaSettingsInputSchema"),
      },
    },
    upsertWaSettingsHandler,
  );
  server.delete("/", deleteWaSettingsHandler);
}
