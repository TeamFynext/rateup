import { FastifyInstance } from "fastify";
import { zapierRoutes } from "./zapier/zapier.route.js";
import { zohoRoutes } from "./zoho/zoho.route.js";

export async function externalIntegrationRoutes(server: FastifyInstance) {
  server.register(zapierRoutes, { prefix: "/zapier" });
  server.register(zohoRoutes, { prefix: "/zoho" });
}
