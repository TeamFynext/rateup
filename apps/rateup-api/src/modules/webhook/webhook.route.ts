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

  // The tree carried checkSession and no role check, so the lowest-privileged
  // member of an organisation could redirect its outgoing event stream to an
  // address they control — orgId is @unique on the model, so a save silently
  // replaces whatever was there and nobody is notified. The challenge handshake
  // does not prevent that; it only requires the new destination to answer.
  // See issues.txt 34.7. The read stays open to any member.
  const requireAdmin = checkRoleHandler(["SUPER_ADMIN", "ADMIN"]);

  server.post<{ Body: import("./webhook.schema.js").SaveWebhookInput }>(
    "/",
    { preHandler: requireAdmin, schema: { body: saveWebhookSchema } },
    saveWebhookHandler,
  );
  server.get("/", getWebhookHandler);
  server.delete("/", { preHandler: requireAdmin }, deleteWebhookHandler);
}
