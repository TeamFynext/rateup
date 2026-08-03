import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { checkRoleHandler } from "../../utils/checkRoleHandler.js";
import {
  deleteWebhookHandler,
  getWebhookHandler,
  saveWebhookHandler,
} from "./webhook.controller.js";
import { saveWebhookSchema } from "./webhook.schema.js";

export async function webhookRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  const requireAdmin = checkRoleHandler(["SUPER_ADMIN", "ADMIN"]);

  server.post<{ Body: import("./webhook.schema.js").SaveWebhookInput }>(
    "/",
    { preHandler: requireAdmin, schema: { body: saveWebhookSchema } },
    saveWebhookHandler,
  );
  server.get("/", getWebhookHandler);
  server.delete("/", { preHandler: requireAdmin }, deleteWebhookHandler);
}
