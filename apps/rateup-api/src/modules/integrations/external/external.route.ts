import { FastifyInstance } from "fastify";
import { getleadRoutes } from "./getlead/getlead.route.js";
import { makeRoutes } from "./make/make.route.js";
import { pabblyRoutes } from "./pabbly/pabbly.route.js";
import { zapierRoutes } from "./zapier/zapier.route.js";
import { zohoRoutes } from "./zoho/zoho.route.js";

export async function externalIntegrationRoutes(server: FastifyInstance) {
  server.register(getleadRoutes, { prefix: "/getlead" });
  server.register(makeRoutes, { prefix: "/make" });
  server.register(pabblyRoutes, { prefix: "/pabbly" });
  server.register(zapierRoutes, { prefix: "/zapier" });
  server.register(zohoRoutes, { prefix: "/zoho" });
}
