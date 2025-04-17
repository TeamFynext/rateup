import { FastifyInstance } from "fastify";
import { waMessageSchemas } from "./message/wamessage.schema";
import { waMessageRoutes } from "./message/waMessage.routes";
import { waQuickReplyRoutes } from "./quickReply/quickReply.route";
import { quickReplySchema } from "./quickReply/quickReply.schema";

export async function waInboxRoutes(server: FastifyInstance) {
  const modules = [waMessageSchemas, quickReplySchema];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.register(waMessageRoutes, { prefix: "/message" });
  server.register(waQuickReplyRoutes, { prefix: "/quick-reply" });
}
