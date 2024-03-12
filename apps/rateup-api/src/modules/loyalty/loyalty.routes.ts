import { FastifyInstance } from "fastify";
import { loyaltyInternalRoutes } from "./internal/internal.route";

export async function loyaltyRoutes(server: FastifyInstance) {
  server.register(loyaltyInternalRoutes, { prefix: "/internal" });
}
