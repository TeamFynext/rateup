import { FastifyInstance } from "fastify";
import { waMessageSchemas } from "./message/wamessage.schema";
import { waMessageRoutes } from "./message/waMessage.routes";
import { waWSMessageRoutes } from "./message/wamessage.ws.routes";

export async function waInboxRoutes(server: FastifyInstance) {
  const modules = [waMessageSchemas];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.register(waMessageRoutes, { prefix: "/message" });
  server.register(waWSMessageRoutes, { prefix: "/ws" });
}
