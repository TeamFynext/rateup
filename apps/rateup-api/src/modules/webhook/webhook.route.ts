import { FastifyInstance } from "fastify";
import {
  deleteWebhookHandler,
  getWebhookHandler,
  saveWebhookHandler,
} from "./webhook.controller.js";
import { saveWebhookSchema } from "./webhook.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function webhookRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  server.post<{ Body: import("./webhook.schema.js").SaveWebhookInput }>(
    "/",
    {
      config: { permission: "webhooks.manage" },
      schema: { body: saveWebhookSchema },
    },
    saveWebhookHandler,
  );
  server.get("/", { config: { permission: "webhooks.read" } }, getWebhookHandler);
  server.delete(
    "/",
    {
      config: { permission: "webhooks.manage" },
    },
    deleteWebhookHandler,
  );
}
