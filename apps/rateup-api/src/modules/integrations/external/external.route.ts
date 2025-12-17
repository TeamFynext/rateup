import { FastifyInstance } from "fastify";
import { zapierRoutes } from "./zapier/zapier.route.js";

export async function externalIntegrationRoutes(server: FastifyInstance) {
  server.register(zapierRoutes, { prefix: "/zapier" });
}
