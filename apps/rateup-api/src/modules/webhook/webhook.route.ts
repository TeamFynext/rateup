import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  deleteWebhookHandler,
  getWebhookHandler,
  saveWebhookHandler,
} from "./webhook.controller.js";
import { saveWebhookSchema } from "./webhook.schema.js";

export async function webhookRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post("/", { schema: { body: saveWebhookSchema } }, saveWebhookHandler);
  server.get("/", getWebhookHandler);
  server.delete("/", deleteWebhookHandler);
}
