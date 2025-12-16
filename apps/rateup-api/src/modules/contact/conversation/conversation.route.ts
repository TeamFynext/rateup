import { FastifyInstance } from "fastify";
import { $conversationRef } from "./conversation.schema";
import {
  getAverageConversationResponseTimeHandler,
  getConversationOnAccountDistributionHandler,
  getConversationOverviewHandler,
  getOverAllQuickStatsOfConversationsHandler,
  getResolvedConversationStatsHandler,
  getStaffConverSationMetricsHandler,
  getStaffDetailedConversationAnalyticsHandler,
  updateConversationHandler,
} from "./conversation.controller";
import { get } from "axios";

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
}
