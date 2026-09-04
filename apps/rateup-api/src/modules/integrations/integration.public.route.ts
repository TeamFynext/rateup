import { FastifyInstance } from "fastify";
import { shopifyPublicRoutes } from "./shopify/shopify.public.route.js";
import { getleadPublicRoutes } from "./external/getlead/getlead.public.route.js";
import { petPoojaWebhookHandler } from "./integrations.controller.js";

export async function integrationPublicRoutes(server: FastifyInstance) {
  server.register(shopifyPublicRoutes, { prefix: "/shopify" });

  // GetLead calls us from a workflow action, so this cannot sit behind a
  // session. Authenticated by the token in the path and an HMAC over the body.
  server.register(getleadPublicRoutes, { prefix: "/getlead" });

  server.post("/petpooja", petPoojaWebhookHandler);
}
