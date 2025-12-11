import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger";
import {
  ConversationParamsSchema,
  StaffIdParamsSchema,
  StatsQuerySchema,
  UpdateConversationSchema,
} from "./conversation.schema";
import {
  getAvargeResponseTimeofTodyaInEveryHour,
  getConversationOnAccountDistribution,
  getConversationOverview,
  getOverAllQuickStatsOfConversations,
  getResolvedCountandTotalCountofDailyInLastNDays,
  getStaffConverSationMetrics,
  getStaffDetailedConversationAnalytics,
  updateConversation,
} from "./conversation.service";

export async function updateConversationHandler(
  request: FastifyRequest<{
    Params: ConversationParamsSchema;
    Body: UpdateConversationSchema;
  }>,
  reply,
) {
  try {
    const { conversationId } = request.params;
    const res = await updateConversation(conversationId, request.body);
    reply.send(res);
  } catch (e) {
    log.error("Error updating conversation:", e);
    reply
      .status(500)
      .send({ error: "An error occurred while updating the conversation." });
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
  } catch (e) {
    log.error("Error fetching conversation overview:", e);
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
    const response = await getResolvedCountandTotalCountofDailyInLastNDays(
      request.user.orgId,
      request.query.days,
    );
    reply.send(response);
  } catch (e) {
    log.error("Error fetching resolved conversation resolved stats: %o", e);
    reply.status(500).send({
      error:
        "An error occurred while fetching the resolved conversation resolved stats.",
    });
  }
}

export async function getAverageConversationResponseTimeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await getAvargeResponseTimeofTodyaInEveryHour(
      request.user.orgId,
    );
    reply.send(res);
  } catch (e) {
    log.error("Error fetching average conversation response time stats:%o", e);
    reply.status(500).send({
      error:
        "An error occurred while fetching the average conversation response time stats.",
    });
  }
}

export async function getConversationOnAccountDistributionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await getConversationOnAccountDistribution(request.user.orgId);
    reply.send(res);
  } catch (e) {
    log.error(
      "Error fetching conversation on account distribution stats: %o",
      e,
    );
    reply.status(500).send({
      error:
        "An error occurred while fetching the conversation on account distribution stats.",
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
    log.error("Error fetching overall quick stats of conversations:%o", e);
    reply.status(500).send({
      error:
        "An error occurred while fetching the overall quick stats of conversations.",
    });
  }
}

export async function getStaffConverSationMetricsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await getStaffConverSationMetrics(request.user.orgId);
    reply.send(res);
  } catch (e) {
    log.error("Error fetching staff conversation metrics:%o", e);
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
      request.query.days,
    );
    reply.send(res);
  } catch (e) {
    log.error("Error fetching staff detailed analytics :%o", e);
    reply.status(500).send({
      error: "An error occurred while fetching the staff detailed analytics.",
    });
  }
}
