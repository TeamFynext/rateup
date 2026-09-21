import { FastifyInstance } from "fastify";
import { addExpoToken, deleteToken, getExpoTokens } from "./mobile.controller.js";
import { addExpoTokenSchema, deleteExpoTokenSchema } from "./mobile.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function mobileNotificationRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  server.post(
    "/",
    {
      schema: {
        body: addExpoTokenSchema,
      },
    },
    addExpoToken,
  );

  server.get("/", getExpoTokens);

  server.delete(
    "/",
    {
      schema: {
        body: deleteExpoTokenSchema,
      },
    },
    deleteToken,
  );
}
