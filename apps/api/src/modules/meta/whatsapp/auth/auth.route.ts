import { FastifyInstance } from "fastify/types/instance.js";
import {
  deRegisterBusinessClientHandler,
  getUserAccessTokenHanlder,
  registerBusinessClientHandler,
} from "./auth.controller.js";
import { declareAccess } from "../../../../authz/registry.js";
import {
  phoneIdParamsSchema,
  registerBusinessBodySchema,
  userTokenBodySchema,
  waSettingsIdParamsSchema,
} from "./auth.schema.js";

export async function waAuthRoutes(server: FastifyInstance) {
  // Connecting, removing and re-syncing a channel all change what the org sends from.
  declareAccess(server, { write: "channels.manage" });

  server.post(
    "/register",
    { schema: { body: registerBusinessBodySchema } },
    registerBusinessClientHandler,
  );
  server.post(
    "/deregister/:phoneId",
    { schema: { params: phoneIdParamsSchema } },
    deRegisterBusinessClientHandler,
  );
  server.post(
    "/user-token/:waSettingsId",
    { schema: { params: waSettingsIdParamsSchema, body: userTokenBodySchema } },
    getUserAccessTokenHanlder,
  );
}
