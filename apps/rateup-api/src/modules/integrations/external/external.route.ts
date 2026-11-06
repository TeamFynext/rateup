import { FastifyInstance } from "fastify";
import { getleadRoutes } from "./getlead/getlead.route.js";
import { makeRoutes } from "./make/make.route.js";
import { pabblyRoutes } from "./pabbly/pabbly.route.js";
import { zapierRoutes } from "./zapier/zapier.route.js";
import { zohoRoutes } from "./zoho/zoho.route.js";
import { rateLimit } from "../../../utils/rateLimit.js";

export async function externalIntegrationRoutes(server: FastifyInstance) {
  // Ahead of every key check below: the Zapier and automation keys are bcrypt hashes,
  // so each guess costs a compare. The ceiling is per IP and generous, because Zapier's
  // and Make's servers call from a shared pool of addresses for every customer.
  server.addHook(
    "onRequest",
    rateLimit({ max: 1200, windowSeconds: 60, key: "integrationExternalIp" }),
  );
  server.register(getleadRoutes, { prefix: "/getlead" });
  server.register(makeRoutes, { prefix: "/make" });
  server.register(pabblyRoutes, { prefix: "/pabbly" });
  server.register(zapierRoutes, { prefix: "/zapier" });
  server.register(zohoRoutes, { prefix: "/zoho" });
}
