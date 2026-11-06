import { FastifyReply, FastifyRequest } from "fastify";
import { analyticsTeamId, cachedAnalytics } from "../../../utils/analyticsCache.js";
import { recordAuditEvent } from "../../../utils/auditLog.js";
import { log } from "../../../utils/logger.js";
import {
  ContactConversationsParamsSchema,
  ConversationParamsSchema,
  DeleteConversationsSchema,
  StaffIdParamsSchema,
  StatsQuerySchema,
  TeamIdParamsSchema,
  UpdateConversationSchema,
} from "./conversation.schema.js";
import type { DeletedTicket } from "./conversation.service.js";
import {
  deleteConversation,
  deleteConversations,
  getAvargeResponseTimeofTodyaInEveryHour,
  getConversationOnAccountDistribution,
  getConversationOverview,
  getConversationsByContactId,
  getOverAllQuickStatsOfConversations,
  getResolvedCountandTotalCountofDailyInLastNDays,
  getStaffConverSationMetrics,
  getStaffDetailedConversationAnalytics,
  getTeamDetailedMetrics,
  getTeamOverview,
  updateConversation,
} from "./conversation.service.js";

/** Inbox Tickets v2 — a contact's full ticket history for the thread history strip. */
export async function getConversationsByContactIdHandler(
  request: FastifyRequest<{
    Params: ContactConversationsParamsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { contactId } = request.params;
    const res = await getConversationsByContactId(request.user.orgId, contactId);
    reply.send(res);
  } catch (error) {
    log.error({ err: error }, "Error listing conversations for contact:");
    reply.status(500).send({ error: "An error occurred while listing conversations." });
  }
}

export async function updateConversationHandler(
  request: FastifyRequest<{
    Params: ConversationParamsSchema;
    Body: UpdateConversationSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { conversationId } = request.params;
    const res = await updateConversation(conversationId, request.user.orgId, request.body);
    reply.send(res);
  } catch (error) {
    log.error({ err: error }, "Error updating conversation:");
    reply.status(500).send({ error: "An error occurred while updating the conversation." });
  }
}

/**
 * How a deleted ticket is named in the audit log. The contact goes in by name and
 * number because the row it came from no longer exists to look up — the entry is
 * the only record left of whose conversation this was.
 */
function describeTicket(ticket: DeletedTicket) {
  return {
    ticket: ticket.number ? `#${ticket.number}` : ticket.id,
    contact: ticket.contactName ?? ticket.contactPhone ?? ticket.contactId,
    contactPhone: ticket.contactPhone,
    contactId: ticket.contactId,
    conversationId: ticket.id,
  };
}

/**
 * Inbox Tickets v2 — permanently delete a ticket and its messages.
 *
 * A missing ticket answers 404 rather than 200: the service returns null when the
 * org owns no such ticket, and reporting that as a successful delete would let
 * the UI drop a row it never actually removed.
 */
export async function deleteConversationHandler(
  request: FastifyRequest<{
    Params: ConversationParamsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { conversationId } = request.params;
    const res = await deleteConversation(conversationId, request.user.orgId);
    if (!res) {
      reply.status(404).send({ error: "Conversation not found." });
      return;
    }
    await recordAuditEvent(request, "Conversation deleted", {
      ...describeTicket(res.ticket),
      messagesDeleted: res.deletedMessages,
    });
    reply.send(res);
  } catch (error) {
    log.error({ err: error }, "Error deleting conversation:");
    reply.status(500).send({ error: "An error occurred while deleting the conversation." });
  }
}

/**
 * Inbox Tickets v2 — delete several tickets at once.
 *
 * Answers with what actually went, which can be less than was asked for: ids the
 * org does not own (or that somebody else has already deleted) are skipped rather
 * than failing the batch.
 */
export async function deleteConversationsHandler(
  request: FastifyRequest<{
    Body: DeleteConversationsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const res = await deleteConversations(request.body.conversationIds, request.user.orgId);
    if (res.deletedConversations > 0) {
      await recordAuditEvent(
        request,
        res.deletedConversations === 1
          ? "Conversation deleted"
          : `${res.deletedConversations} conversations deleted`,
        {
          // One row for the batch, listing every ticket it took, so the log says
          // whose conversations went rather than just how many.
          conversations: res.tickets.map(describeTicket),
          messagesDeleted: res.deletedMessages,
        },
      );
    }
    reply.send(res);
  } catch (error) {
    log.error({ err: error }, "Error deleting conversations:");
    reply.status(500).send({ error: "An error occurred while deleting the conversations." });
  }
}

export async function getConversationOverviewHandler(
  request: FastifyRequest<{
    Querystring: StatsQuerySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const dateRange = request.query.dateRange?.split(",") || [];
    const { orgId } = request.user;
    // The cache key is built from `params` and the range only, so the team must be in it.
    const teamId = analyticsTeamId(request.query.teamId);
    const stats = await cachedAnalytics(
      {
        orgId,
        endpoint: "conversation:overview",
        params: { teamId },
        dateRange,
        liveness: "standard",
        query: request.query,
      },
      () => getConversationOverview(orgId, dateRange, teamId),
    );
    reply.send(stats);
  } catch (error) {
    log.error({ err: error }, "Error fetching conversation overview:");
    reply.status(500).send({
      error: "An error occurred while fetching the conversation overview.",
    });
  }
}

export async function getResolvedConversationStatsHandler(
  request: FastifyRequest<{
    Querystring: StatsQuerySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const dateRange = request.query.dateRange?.split(",") || [];
    // `days` is optional on the querystring; previously an omitted value was
    // passed straight through to `Date#setDate`, producing an `Invalid Date`
    // rather than a sensible default window.
    const { orgId } = request.user;
    const days = request.query.days ?? 30;
    const teamId = analyticsTeamId(request.query.teamId);
    const response = await cachedAnalytics(
      {
        orgId,
        endpoint: "conversation:resolved-stats",
        params: { days, teamId },
        dateRange,
        liveness: "standard",
        query: request.query,
      },
      () => getResolvedCountandTotalCountofDailyInLastNDays(orgId, days, dateRange, teamId),
    );
    reply.send(response);
  } catch (error) {
    log.error({ err: error }, "Error fetching resolved conversation resolved stats:");
    reply.status(500).send({
      error: "An error occurred while fetching the resolved conversation resolved stats.",
    });
  }
}

export async function getAverageConversationResponseTimeHandler(
  request: FastifyRequest<{ Querystring: StatsQuerySchema }>,
  reply: FastifyReply,
) {
  try {
    const dateRange = request.query.dateRange?.split(",") || [];
    const dateKey = request.query.dateKey ?? "";
    const { orgId } = request.user;
    const teamId = analyticsTeamId(request.query.teamId);
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "conversation:response-stats",
        params: { dateKey, teamId },
        dateRange,
        liveness: "standard",
        query: request.query,
      },
      () => getAvargeResponseTimeofTodyaInEveryHour(orgId, dateKey, dateRange, teamId),
    );
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching average conversation response time stats:");
    reply.status(500).send({
      error: "An error occurred while fetching the average conversation response time stats.",
    });
  }
}

export async function getConversationOnAccountDistributionHandler(
  request: FastifyRequest<{ Querystring: StatsQuerySchema }>,
  reply: FastifyReply,
) {
  try {
    const dateRange = request.query.dateRange?.split(",") || [];
    const { orgId } = request.user;
    const teamId = analyticsTeamId(request.query.teamId);
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "conversation:account-distribution",
        params: { teamId },
        dateRange,
        liveness: "standard",
        query: request.query,
      },
      () => getConversationOnAccountDistribution(orgId, dateRange, teamId),
    );
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching conversation on account distribution stats:");
    reply.status(500).send({
      error: "An error occurred while fetching the conversation on account distribution stats.",
    });
  }
}

export async function getOverAllQuickStatsOfConversationsHandler(
  request: FastifyRequest<{ Querystring: StatsQuerySchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const teamId = analyticsTeamId(request.query.teamId);
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "conversation:quick-stats",
        params: { teamId },
        liveness: "quick",
        query: request.query,
      },
      () => getOverAllQuickStatsOfConversations(orgId, teamId),
    );
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching overall quick stats of conversations:");
    reply.status(500).send({
      error: "An error occurred while fetching the overall quick stats of conversations.",
    });
  }
}

export async function getStaffConverSationMetricsHandler(
  request: FastifyRequest<{ Querystring: StatsQuerySchema }>,
  reply: FastifyReply,
) {
  try {
    const dateRange = request.query.dateRange?.split(",") || [];
    const { orgId } = request.user;
    const teamId = analyticsTeamId(request.query.teamId);
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "conversation:staff-metrics",
        params: { teamId },
        dateRange,
        liveness: "heavy",
        query: request.query,
      },
      () => getStaffConverSationMetrics(orgId, dateRange, teamId),
    );
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching staff conversation metrics:");
    reply.status(500).send({
      error: "An error occurred while fetching the staff conversation metrics.",
    });
  }
}

export async function getStaffDetailedConversationAnalyticsHandler(
  request: FastifyRequest<{
    Params: StaffIdParamsSchema;
    Querystring: StatsQuerySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { staffId } = request.params;
    const days = request.query.days ?? 30;
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "conversation:staff-detailed",
        params: { staffId, days },
        liveness: "heavy",
        query: request.query,
      },
      () => getStaffDetailedConversationAnalytics(orgId, staffId, days),
    );
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching staff detailed analytics :");
    reply.status(500).send({
      error: "An error occurred while fetching the staff detailed analytics.",
    });
  }
}

export async function getTeamOverviewHandler(
  request: FastifyRequest<{ Querystring: StatsQuerySchema }>,
  reply: FastifyReply,
) {
  try {
    const dateRange = request.query.dateRange?.split(",") || [];
    const { orgId } = request.user;
    const teamId = analyticsTeamId(request.query.teamId);
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "conversation:team-overview",
        params: { teamId },
        dateRange,
        liveness: "heavy",
        query: request.query,
      },
      () => getTeamOverview(orgId, dateRange, teamId),
    );
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching team overview :");
    reply.status(500).send({
      error: "An error occurred while fetching the team overview.",
    });
  }
}

export async function getTeamDetailedMetricsHandler(
  request: FastifyRequest<{
    Params: TeamIdParamsSchema;
    Querystring: StatsQuerySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { teamId } = request.params;
    const days = request.query.days ?? 30;
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "conversation:team-metrics",
        params: { teamId, days },
        liveness: "heavy",
        query: request.query,
      },
      () => getTeamDetailedMetrics(teamId, orgId, days),
    );
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching team metrics :");
    reply.status(500).send({
      error: "An error occurred while fetching the team metrics.",
    });
  }
}
