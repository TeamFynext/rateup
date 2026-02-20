import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  getApiAnalyticsHandler,
  getDeliveredFailedTrendHandler,
  getTeamPerformanceStatsHandler,
  getTemplateCategoryHandler,
} from "./apianalytics.controller.js";
import { $apiAnalyticsRef } from "./apianalytics.schema.js";

export async function apiAnalyticsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.get(
    "/",
    {
      schema: {
        querystring: $apiAnalyticsRef("statsQuerySchema"),
      },
    },
    getApiAnalyticsHandler,
  );
  server.get(
    "/trend",
    {
      schema: {
        querystring: $apiAnalyticsRef("trendQuerySchema"),
      },
    },
    getDeliveredFailedTrendHandler,
  );
  server.get(
    "/template-overview",
    {
      schema: {
        querystring: $apiAnalyticsRef("statsQuerySchema"),
      },
    },
    getTemplateCategoryHandler,
  );
  server.get(
    "/team-overview",
    {
      schema: {
        querystring: $apiAnalyticsRef("statsQuerySchema"),
      },
    },
    getTeamPerformanceStatsHandler,
  );
}
