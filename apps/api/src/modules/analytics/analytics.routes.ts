import { FastifyInstance } from "fastify";
import {
  getApiAnalyticsHandler,
  getDeliveredFailedTrendHandler,
  getTeamPerformanceStatsHandler,
  getTemplateCategoryHandler,
} from "./analytics.controller.js";
import { statsQuerySchema, trendQuerySchema } from "./analytics.schema.js";
import { declareAccess } from "../../authz/registry.js";

export async function apiAnalyticsRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });
  server.get(
    "/",
    {
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getApiAnalyticsHandler,
  );
  server.get(
    "/trend",
    {
      schema: {
        querystring: trendQuerySchema,
      },
    },
    getDeliveredFailedTrendHandler,
  );
  server.get(
    "/template-overview",
    {
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getTemplateCategoryHandler,
  );
  server.get(
    "/team-overview",
    {
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getTeamPerformanceStatsHandler,
  );
}
