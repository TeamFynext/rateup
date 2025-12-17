import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import { getUsageStatHandler } from "./stats.controller.js";

export async function statsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.get("/", getUsageStatHandler);
}
