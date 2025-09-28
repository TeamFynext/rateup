import { FastifyInstance } from "fastify";
import { zapierRoutes } from "./zapier/zapier.route";

export async function externalIntegrationRoutes(server: FastifyInstance) {
  server.register(zapierRoutes, { prefix: "/zapier" });
}
