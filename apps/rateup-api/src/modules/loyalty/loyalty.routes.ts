import { FastifyInstance } from "fastify";
import { loyaltyInternalRoutes } from "./internal/internal.route";
import { externalLoyaltyRoutes } from "./external/external.loyalty.routes";

export async function loyaltyRoutes(server: FastifyInstance) {
  server.register(loyaltyInternalRoutes, { prefix: "/internal" });
  server.register(externalLoyaltyRoutes, { prefix: "/external/:orgId" });
}
