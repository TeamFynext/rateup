import { FastifyInstance } from "fastify";
import { waMessageSchemas } from "./message/wamessage.schema.js";
import { waMessageRoutes } from "./message/waMessage.routes.js";

export async function waInboxRoutes(server: FastifyInstance) {
  const modules = [waMessageSchemas];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.register(waMessageRoutes, { prefix: "/message" });
}
