import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import { getUsageStatHandler } from "./stats.controller";

export async function statsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.get("/", getUsageStatHandler);
}
