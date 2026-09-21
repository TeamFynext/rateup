import { FastifyInstance } from "fastify";
import { waMessageRoutes } from "./message/waMessage.routes.js";
import { waQuickReplyRoutes } from "./quickReply/quickReply.route.js";
import { waAutomationRoutes } from "./automation/inboxautomation.routes.js";
import { declareAccess } from "../../../authz/registry.js";

export async function waInboxRoutes(server: FastifyInstance) {
  declareAccess(server, { read: "inbox.read", write: "inbox.reply" });
  server.register(waMessageRoutes, { prefix: "/message" });
  server.register(waQuickReplyRoutes, { prefix: "/quick-reply" });
  server.register(waAutomationRoutes, { prefix: "/automation" });
}
