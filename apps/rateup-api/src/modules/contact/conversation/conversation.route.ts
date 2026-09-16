import { FastifyInstance } from "fastify";
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
import { checkRoleHandler } from "../../../utils/checkRoleHandler.js";

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

  // Deleting a ticket destroys its messages with it and cannot be undone, so it
  // is kept to org admins rather than to everyone who can work the inbox.
  server.delete<{ Params: ConversationParamsSchema }>(
    "/:conversationId",
    {
      preHandler: checkRoleHandler(["SUPER_ADMIN", "ADMIN"]),
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
      preHandler: checkRoleHandler(["SUPER_ADMIN", "ADMIN"]),
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
        querystring: statsQuerySchema,
      },
    },
    getTeamDetailedMetricsHandler,
  );
}
