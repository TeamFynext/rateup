import { FastifyInstance } from "fastify";
import {
  updateConversationSchema,
  conversationParamsSchema,
  contactConversationsParamsSchema,
  statsQuerySchema,
  staffIdParamsSchema,
  teamIdParamsSchema,
} from "./conversation.schema.js";
import {
  getAverageConversationResponseTimeHandler,
  getConversationOnAccountDistributionHandler,
  getConversationOverviewHandler,
  getConversationsByContactIdHandler,
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

  // Inbox Tickets v2 — a contact's ticket history (the thread's pinned strip).
  // Declared before "/:conversationId"-style GETs so the literal segment wins.
  server.get(
    "/by-contact/:contactId",
    {
      schema: {
        params: contactConversationsParamsSchema,
      },
    },
    getConversationsByContactIdHandler,
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
  // `querystring: statsQuerySchema` — every other stats route on this server
  // declares it, and it is what supplies `days` and coerces it to a number.
  // Without it `request.query.days` was undefined,
  // `sinceDate.setDate(sinceDate.getDate() - undefined)` yielded NaN, and
  // `sinceDate.toISOString()` inside the SQL threw a RangeError before the query
  // was even issued. See issues.txt 18.40.
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
  // Same gap. getTeamDetailedMetrics has no toISOString, so its Invalid Date was
  // bound into the query and postgres rejected it — also a 500.
  // See issues.txt 18.40.
  server.get(
    "/team-metrics/:teamId",
    {
      schema: {
        params: teamIdParamsSchema,
        querystring: statsQuerySchema,
      },
    },
    getTeamDetailedMetricsHandler,
  );
}
