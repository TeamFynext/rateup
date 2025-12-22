import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  addExpoToken,
  deleteToken,
  getExpoTokens,
} from "./mobile.controller.js";
import { $ExpoRef } from "./mobile.schema.js";

export async function mobileNotificationRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post(
    "/",
    {
      schema: {
        body: $ExpoRef("addExpoTokenSchema"),
      },
    },
    addExpoToken,
  );

  server.get("/", getExpoTokens);

  server.delete(
    "/",
    {
      schema: {
        body: $ExpoRef("deleteExpoTokenSchema"),
      },
    },
    deleteToken,
  );
}
