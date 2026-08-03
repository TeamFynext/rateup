import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import {
  getDeliveredFailedTrend,
  getDeliveredFailedWeekTrend,
  getTeamPerformanceStats,
  getTemplateCategoryOverview,
  getTemplatePerformanceStats,
  getWaMessageOverviewByTeamAndOrg,
} from "./apianalytics.service.js";
import { StatsQuerySchema, TrendQuerySchema } from "./apianalytics.schema.js";

export async function getApiAnalyticsHandler(
  request: FastifyRequest<{
    Querystring: StatsQuerySchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const dateRange = request.query.dateRange?.split(",") || [];
  const teamId = request.query?.teamId;
  const apiType = request.query?.apiType ?? "all";
  try {
    const res = await getWaMessageOverviewByTeamAndOrg(teamId, orgId, dateRange, apiType);
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching api analytics");
    reply.status(500).send({
      error: "An error occurred while fetching the api analytics.",
    });
  }
}

export async function getDeliveredFailedTrendHandler(
  request: FastifyRequest<{ Querystring: TrendQuerySchema }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const apiType = request.query?.apiType ?? "all";
  const teamId = request.query.teamId ?? "all";
  const granularity = request.query.granularity === "hour" ? "hour" : "day";

  const dateRange =
    request.query.dateRange?.split(",").length === 2
      ? (request.query.dateRange.split(",") as [string, string])
      : undefined;

  try {
    const [trend, weekTrend] = await Promise.all([
      getDeliveredFailedTrend(orgId, teamId, granularity, dateRange, apiType),
      getDeliveredFailedWeekTrend(orgId, teamId, dateRange, apiType),
    ]);

    reply.send({
      trend,
      weekTrend,
    });
  } catch (e) {
    log.error({ err: e }, "Error fetching message trend");
    reply.status(500).send({
      error: "An error occurred while fetching the message trend.",
    });
  }
}

export async function getTemplateCategoryHandler(
  request: FastifyRequest<{
    Querystring: StatsQuerySchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const apiType = request.query?.apiType ?? "all";
  const dateRange = request.query.dateRange?.split(",") || [];
  const teamId = request.query?.teamId || "all";

  try {
    const [categoryOverview, templatePerformance] = await Promise.all([
      getTemplateCategoryOverview(orgId, teamId, dateRange, apiType),
      getTemplatePerformanceStats(orgId, teamId, dateRange, apiType),
    ]);

    reply.send({
      categoryOverview,
      templatePerformance,
    });
  } catch (e) {
    log.error({ err: e }, "Error fetching template analytics");
    reply.status(500).send({
      error: "An error occurred while fetching the template analytics.",
    });
  }
}

export async function getTeamPerformanceStatsHandler(
  request: FastifyRequest<{
    Querystring: StatsQuerySchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const apiType = request.query?.apiType ?? "all";
  const dateRange = request.query.dateRange?.split(",") || [];
  try {
    const res = await getTeamPerformanceStats(orgId, dateRange, apiType);
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching team api stats");
    reply.status(500).send({
      error: "An error occurred while fetching team api stats.",
    });
  }
}
