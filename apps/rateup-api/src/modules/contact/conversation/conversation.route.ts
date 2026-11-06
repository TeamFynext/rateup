import { FastifyInstance } from "fastify";
import { verifyAnalyticsTeamScope } from "./conversation.auth.js";
import {
  updateConversationSchema,
  conversationParamsSchema,
  contactConversationsParamsSchema,
  deleteConversationsSchema,
  statsQuerySchema,
  staffIdParamsSchema,
  teamIdParamsSchema,
} from "./conversation.schema.js";
import type { ConversationParamsSchema, DeleteConversationsSchema } from "./conversation.schema.js";
import {
  deleteConversationHandler,
  deleteConversationsHandler,
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
      config: { permission: "inbox.manage" },
      schema: {
        body: updateConversationSchema,
        params: conversationParamsSchema,
      },
    },
    updateConversationHandler,
  );

  // Deleting a ticket destroys its messages with it and cannot be undone, so it
  // is kept to org admins rather than to everyone who can work the inbox.
  server.delete<{ Params: ConversationParamsSchema }>(
    "/:conversationId",
    {
      config: { permission: "inbox.delete" },
      schema: {
        params: conversationParamsSchema,
      },
    },
    deleteConversationHandler,
  );

  // The list's bulk delete. A body-carrying DELETE, matching how `/contact`
  // deletes many contacts; the ids are a selection, not a path.
  server.delete<{ Body: DeleteConversationsSchema }>(
    "/",
    {
      config: { permission: "inbox.delete" },
      schema: {
        body: deleteConversationsSchema,
      },
    },
    deleteConversationsHandler,
  );

  // Inbox Tickets v2 — a contact's ticket history (the thread's pinned strip).
  // Declared before "/:conversationId"-style GETs so the literal segment wins.
  server.get(
    "/by-contact/:contactId",
    {
      config: { permission: "inbox.read" },
      schema: {
        params: contactConversationsParamsSchema,
      },
    },
    getConversationsByContactIdHandler,
  );

  server.get(
    "/overview",
    {
      config: { permission: "analytics.read" },
      preHandler: [verifyAnalyticsTeamScope],
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getConversationOverviewHandler,
  );
  server.get(
    "/conversation-resolved-stats",
    {
      config: { permission: "analytics.read" },
      preHandler: [verifyAnalyticsTeamScope],
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getResolvedConversationStatsHandler,
  );
  server.get(
    "/conversation-response-stats",
    {
      config: { permission: "analytics.read" },
      preHandler: [verifyAnalyticsTeamScope],
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getAverageConversationResponseTimeHandler,
  );
  server.get(
    "/account-distribution",
    {
      config: { permission: "analytics.read" },
      preHandler: [verifyAnalyticsTeamScope],
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getConversationOnAccountDistributionHandler,
  );
  server.get(
    "/staff-metrics",
    {
      config: { permission: "analytics.read" },
      preHandler: [verifyAnalyticsTeamScope],
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getStaffConverSationMetricsHandler,
  );
  server.get(
    "/quick-stats",
    {
      config: { permission: "analytics.read" },
      preHandler: [verifyAnalyticsTeamScope],
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getOverAllQuickStatsOfConversationsHandler,
  );
  server.get(
    "/staff-detailed-analytics/:staffId",
    {
      config: { permission: "analytics.read" },
      preHandler: [verifyAnalyticsTeamScope],
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
      config: { permission: "analytics.read" },
      preHandler: [verifyAnalyticsTeamScope],
      schema: {
        querystring: statsQuerySchema,
      },
    },
    getTeamOverviewHandler,
  );
  server.get(
    "/team-metrics/:teamId",
    {
      config: { permission: "analytics.read" },
      preHandler: [verifyAnalyticsTeamScope],
      schema: {
        params: teamIdParamsSchema,
        querystring: statsQuerySchema,
      },
    },
    getTeamDetailedMetricsHandler,
  );
}
