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
    getAverageConversationResponseTimeHandler,
  );
  server.get(
    "/account-distribution",
    getConversationOnAccountDistributionHandler,
  );
  server.get("/staff-metrics", getStaffConverSationMetricsHandler);
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
