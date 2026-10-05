import { FastifyInstance } from "fastify";
import {
  deleteWebhookHandler,
  getWebhookHandler,
  getWebhookSecretHandler,
  rotateWebhookSecretHandler,
  saveWebhookHandler,
  updateWebhookEventsHandler,
} from "./webhook.controller.js";
import {
  saveWebhookSchema,
  updateWebhookEventsSchema,
  type UpdateWebhookEventsInput,
} from "./webhook.schema.js";
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
  server.patch<{ Body: UpdateWebhookEventsInput }>(
    "/events",
    {
      config: { permission: "webhooks.manage" },
      schema: { body: updateWebhookEventsSchema },
    },
    updateWebhookEventsHandler,
  );
  // The secret signs every delivery; reading it is as sensitive as changing it.
  server.get("/secret", { config: { permission: "webhooks.manage" } }, getWebhookSecretHandler);
  server.post(
    "/secret/rotate",
    { config: { permission: "webhooks.manage" } },
    rotateWebhookSecretHandler,
  );
  server.delete(
    "/",
    {
      config: { permission: "webhooks.manage" },
    },
    deleteWebhookHandler,
  );
}
