import { FastifyInstance } from "fastify";
import { getUsageStatHandler } from "./stats.controller.js";
import { declareAccess } from "../../authz/registry.js";

export async function statsRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  server.get("/", getUsageStatHandler);
}
