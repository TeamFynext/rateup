import { FastifyInstance } from "fastify";
import { shopifyPublicRoutes } from "./shopify/shopify.public.route";
import { petPoojaWebhookHandler } from "./integrations.controller";

export async function integrationPublicRoutes(server: FastifyInstance) {
  server.register(shopifyPublicRoutes, { prefix: "/shopify" });

  server.post("/petpooja", petPoojaWebhookHandler);
}
