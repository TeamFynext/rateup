import { FastifyInstance } from "fastify";
import {
  addExpoToken,
  addVoipTokenHandler,
  deleteToken,
  deleteVoipTokenHandler,
  getExpoTokens,
} from "./mobile.controller.js";
import { addExpoTokenSchema, deleteExpoTokenSchema, voipTokenSchema } from "./mobile.schema.js";
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

  // iOS PushKit tokens, for ringing calls through CallKit while the app is closed.
  server.post("/voip", { schema: { body: voipTokenSchema } }, addVoipTokenHandler);
  server.delete("/voip", { schema: { body: voipTokenSchema } }, deleteVoipTokenHandler);
}
