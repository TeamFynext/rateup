import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  addExpoToken,
  deleteToken,
  getExpoTokens,
} from "./mobile.controller.js";
import { addExpoTokenSchema, deleteExpoTokenSchema } from "./mobile.schema.js";

export async function mobileNotificationRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

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
