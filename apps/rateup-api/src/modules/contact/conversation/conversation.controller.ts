import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import {
  ContactConversationsParamsSchema,
  ConversationParamsSchema,
  StaffIdParamsSchema,
  StatsQuerySchema,
  TeamIdParamsSchema,
  UpdateConversationSchema,
} from "./conversation.schema.js";
import {
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
    const res = await updateConversation(conversationId, request.body);
    reply.send(res);
  } catch (error) {
    log.error({ err: error }, "Error updating conversation:");
    reply.status(500).send({ error: "An error occurred while updating the conversation." });
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
    const stats = await getConversationOverview(request.user.orgId, dateRange);
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
    const response = await getResolvedCountandTotalCountofDailyInLastNDays(
      request.user.orgId,
      request.query.days ?? 30,
      dateRange,
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
    const res = await getAvargeResponseTimeofTodyaInEveryHour(
      request.user.orgId,
      dateKey,
      dateRange,
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
    const res = await getConversationOnAccountDistribution(request.user.orgId, dateRange);
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching conversation on account distribution stats:");
    reply.status(500).send({
      error: "An error occurred while fetching the conversation on account distribution stats.",
    });
  }
}

export async function getOverAllQuickStatsOfConversationsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await getOverAllQuickStatsOfConversations(request.user.orgId);
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
    const res = await getStaffConverSationMetrics(request.user.orgId, dateRange);
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
    const res = await getStaffDetailedConversationAnalytics(
      request.user.orgId,
      request.params.staffId,
      request.query.days ?? 30,
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
    const res = await getTeamOverview(request.user.orgId, dateRange);
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
    const res = await getTeamDetailedMetrics(
      request.params.teamId,
      request.user.orgId,
      request.query.days ?? 30,
    );
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching team metrics :");
    reply.status(500).send({
      error: "An error occurred while fetching the team metrics.",
    });
  }
}
