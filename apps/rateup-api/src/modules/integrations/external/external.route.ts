import { FastifyInstance } from "fastify";
import { getleadRoutes } from "./getlead/getlead.route.js";
import { zapierRoutes } from "./zapier/zapier.route.js";
import { zohoRoutes } from "./zoho/zoho.route.js";

export async function externalIntegrationRoutes(server: FastifyInstance) {
  server.register(getleadRoutes, { prefix: "/getlead" });
  server.register(zapierRoutes, { prefix: "/zapier" });
  server.register(zohoRoutes, { prefix: "/zoho" });
}
