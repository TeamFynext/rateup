import { FastifyInstance } from "fastify";
import {
  getApiAnalyticsHandler,
  getDeliveredFailedTrendHandler,
  getTeamPerformanceStatsHandler,
  getTemplateCategoryHandler,
} from "./apianalytics.controller.js";
import { statsQuerySchema, trendQuerySchema } from "./apianalytics.schema.js";
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
