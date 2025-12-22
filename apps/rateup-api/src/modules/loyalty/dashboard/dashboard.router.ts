import { FastifyInstance } from "fastify";
import { getLoyaltyDashboardStatsHandler } from "./dashboard.controller.js";

export async function loyaltyDashboardRoutes(server: FastifyInstance) {
  server.get("/", getLoyaltyDashboardStatsHandler);
}
