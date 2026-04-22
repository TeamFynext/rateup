import { FastifyInstance } from "fastify";
import { waMessageRoutes } from "./message/waMessage.routes.js";
import { waQuickReplyRoutes } from "./quickReply/quickReply.route.js";
import { requireFeature, TeamFeature } from "../../../utils/permissions.js";
import { checkSession } from "../../../utils/checkSession.js";

export async function waInboxRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", requireFeature(TeamFeature.inbox));
  server.register(waMessageRoutes, { prefix: "/message" });
  server.register(waQuickReplyRoutes, { prefix: "/quick-reply" });
}
