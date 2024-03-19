import { FastifyInstance } from "fastify";
import { checkSession } from "../../../utils/checkSession";
import { waContactSchemas } from "./contact/wacontact.schema";
import { waMessageSchemas } from "./message/wamessage.schema";
import { waContactRoutes } from "./contact/wacontact.routes";
import { waMessageRoutes } from "./message/waMessage.routes";

export async function waInboxRoutes(server: FastifyInstance) {
  const modules = [waContactSchemas, waMessageSchemas];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.addHook("preHandler", checkSession);
  server.register(waContactRoutes, { prefix: "/contact" });
  server.register(waMessageRoutes, { prefix: "/message" });
}
