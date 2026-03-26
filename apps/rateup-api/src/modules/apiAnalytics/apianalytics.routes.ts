import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession.js";
import {
  getApiAnalyticsHandler,
  getDeliveredFailedTrendHandler,
  getTeamPerformanceStatsHandler,
  getTemplateCategoryHandler,
} from "./apianalytics.controller.js";
import { statsQuerySchema, trendQuerySchema } from "./apianalytics.schema.js";

export async function apiAnalyticsRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
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
