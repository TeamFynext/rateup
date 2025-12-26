import { FastifyInstance } from "fastify";
import { $conversationRef } from "./conversation.schema.js";
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
        body: $conversationRef("updateConversationSchema"),
        params: $conversationRef("conversationParamsSchema"),
      },
    },
    updateConversationHandler,
  );

  server.get(
    "/overview",
    {
      schema: {
        querystring: $conversationRef("statsQuerySchema"),
      },
    },
    getConversationOverviewHandler,
  );
  server.get(
    "/conversation-resolved-stats",
    {
      schema: {
        querystring: $conversationRef("statsQuerySchema"),
      },
    },
    getResolvedConversationStatsHandler,
  );
  server.get(
    "/conversation-response-stats",
    {
      schema: {
        querystring: $conversationRef("statsQuerySchema"),
      },
    },
    getAverageConversationResponseTimeHandler,
  );
  server.get(
    "/account-distribution",
    {
      schema: {
        querystring: $conversationRef("statsQuerySchema"),
      },
    },
    getConversationOnAccountDistributionHandler,
  );
  server.get(
    "/staff-metrics",
    {
      schema: {
        querystring: $conversationRef("statsQuerySchema"),
      },
    },
    getStaffConverSationMetricsHandler,
  );
  server.get("/quick-stats", getOverAllQuickStatsOfConversationsHandler);
  server.get(
    "/staff-detailed-analytics/:staffId",
    {
      schema: {
        params: $conversationRef("staffIdParamsSchema"),
        querystring: $conversationRef("statsQuerySchema"),
      },
    },
    getStaffDetailedConversationAnalyticsHandler,
  );
  server.get(
    "/team-overview",
    {
      schema: {
        querystring: $conversationRef("statsQuerySchema"),
      },
    },
    getTeamOverviewHandler,
  );
  server.get(
    "/team-metrics/:teamId",
    {
      schema: {
        params: $conversationRef("teamIdParamsSchema"),
      },
    },
    getTeamDetailedMetricsHandler,
  );
}
