import { FastifyInstance } from "fastify";
import { createWaSettingsHandler, getWaSettingsHandler, upsertWaSettingsHandler } from "./wa_settings.controller";
import { $WASettingsref } from "./wa_settings.schema";
import { checkSession } from "../../../utils/checkSession";

export async function waSettingsRoutes(server: FastifyInstance) {
    server.addHook('preHandler', checkSession)
    server.get("/", getWaSettingsHandler);
    server.post(
        "/",
        {
            schema: {
                body: $WASettingsref('createWaSettingsInputSchema'),
            }
        },
        createWaSettingsHandler
    )
    server.put(
        "/",
        {
            schema: {
                body: $WASettingsref('updateWaSettingsInputSchema'),
            }
        },
        upsertWaSettingsHandler
    )

}