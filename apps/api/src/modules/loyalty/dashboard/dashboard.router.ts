import { FastifyInstance } from "fastify";

import { getLoyaltyDashboardStatsHandler } from "./dashboard.controller.js";
import { dashboardQuerySchema, dashboardResponseSchema } from "./dashboard.schema.js";

export async function loyaltyDashboardRoutes(server: FastifyInstance) {
  server.get(
    "/",
    { schema: { querystring: dashboardQuerySchema, response: { 200: dashboardResponseSchema } } },
    getLoyaltyDashboardStatsHandler,
  );
}
