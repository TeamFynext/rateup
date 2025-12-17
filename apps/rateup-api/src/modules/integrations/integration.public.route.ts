import { FastifyInstance } from "fastify";
import { shopifyPublicRoutes } from "./shopify/shopify.public.route.js";
import { petPoojaWebhookHandler } from "./integrations.controller.js";

export async function integrationPublicRoutes(server: FastifyInstance) {
  server.register(shopifyPublicRoutes, { prefix: "/shopify" });

  server.post("/petpooja", petPoojaWebhookHandler);
}
