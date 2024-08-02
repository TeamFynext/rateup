import { FastifyInstance } from "fastify";
import { shopifyPublicRoutes } from "./shopify/shopify.public.route";

export async function integrationPublicRoutes(server: FastifyInstance) {
  server.register(shopifyPublicRoutes, { prefix: "/shopify" });
}
