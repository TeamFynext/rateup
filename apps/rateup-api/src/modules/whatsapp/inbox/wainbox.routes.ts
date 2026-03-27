import { FastifyInstance } from "fastify";
import { waMessageRoutes } from "./message/waMessage.routes.js";
import { waQuickReplyRoutes } from "./quickReply/quickReply.route.js";

export async function waInboxRoutes(server: FastifyInstance) {
  server.register(waMessageRoutes, { prefix: "/message" });
  server.register(waQuickReplyRoutes, { prefix: "/quick-reply" });
}
