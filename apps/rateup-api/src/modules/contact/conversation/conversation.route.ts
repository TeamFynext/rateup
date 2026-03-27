import { FastifyInstance } from "fastify";
import {
  updateConversationSchema,
  conversationParamsSchema,
  statsQuerySchema,
  staffIdParamsSchema,
  teamIdParamsSchema,
} from "./conversation.schema.js";
import {
  getAverageConversationResponseTimeHandler,
  getConversationOnAccountDistributionHandler,
  getConversationOverviewHandler,
  getOverAllQuickStatsOfConversationsHandler,
  getResolvedConversationStatsHandler,
  getStaffConverSationMetricsHandler,
  getStaffDetailedConversationAnalyticsHandler,
  getTeamDetailedMetricsHandler,
  getTeamOverviewHandler,
  updateConversationHandler,
} from "./conversation.controller.js";

export async function conversationRoutes(server: FastifyInstance) {
  server.put(
    "/:conversationId",
    {
      schema: {
        body: updateConversationSchema,
        params: conversationParamsSchema,
      },
    },
    updateConversationHandler,
  );

  server.get(
    "/overview",
    {
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getConversationOverviewHandler,
  );
  server.get(
    "/conversation-resolved-stats",
    {
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getResolvedConversationStatsHandler,
  );
  server.get(
    "/conversation-response-stats",
    {
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getAverageConversationResponseTimeHandler,
  );
  server.get(
    "/account-distribution",
    {
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getConversationOnAccountDistributionHandler,
  );
  server.get(
    "/staff-metrics",
    {
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getStaffConverSationMetricsHandler,
  );
  server.get("/quick-stats", getOverAllQuickStatsOfConversationsHandler);
  server.get(
    "/staff-detailed-analytics/:staffId",
    {
      schema: {
        params: staffIdParamsSchema,
        querystring: statsQuerySchema,
      },
    },
    getStaffDetailedConversationAnalyticsHandler,
  );
  server.get(
    "/team-overview",
    {
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getTeamOverviewHandler,
  );
  server.get(
    "/team-metrics/:teamId",
    {
      schema: {
        params: teamIdParamsSchema,
      },
    },
    getTeamDetailedMetricsHandler,
  );
}
