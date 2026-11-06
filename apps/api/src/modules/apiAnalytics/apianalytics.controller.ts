import { FastifyReply, FastifyRequest } from "fastify";
import { cachedAnalytics, parseDateRangeParam } from "../../utils/analyticsCache.js";
import { log } from "../../utils/logger.js";
import {
  getDeliveredFailedTrend,
  getTeamPerformanceStats,
  getTemplateCategoryOverview,
  getTemplatePerformanceStats,
  getWaMessageOverview,
  resolveTrendGranularity,
} from "./apianalytics.service.js";
import { StatsQuerySchema, TrendQuerySchema } from "./apianalytics.schema.js";

/**
 * The team as it goes into a cache key. The service reads "all", "null", and an
 * absent team the same way, so they must not get an entry each.
 */
function teamForKey(teamId: string | null | undefined): string {
  return !teamId || teamId === "all" || teamId === "null" ? "all" : teamId;
}

export async function getApiAnalyticsHandler(
  request: FastifyRequest<{
    Querystring: StatsQuerySchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const dateRange = parseDateRangeParam(request.query.dateRange);
  const teamId = request.query?.teamId;
  const apiType = request.query?.apiType ?? "all";
  try {
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "messages:overview",
        params: { teamId: teamForKey(teamId), apiType },
        dateRange,
        liveness: "standard",
        query: request.query,
      },
      () => getWaMessageOverview(orgId, teamId, dateRange, apiType),
    );
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
  const dateRange = parseDateRangeParam(request.query.dateRange);
  const granularity = resolveTrendGranularity(request.query.granularity, dateRange);

  try {
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "messages:trend",
        params: { teamId: teamForKey(teamId), apiType, granularity },
        dateRange,
        liveness: "standard",
        query: request.query,
      },
      async () => {
        const trend = await getDeliveredFailedTrend(orgId, teamId, granularity, dateRange, apiType);
        return { trend, granularity };
      },
    );

    reply.send(res);
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
  const dateRange = parseDateRangeParam(request.query.dateRange);
  const teamId = request.query?.teamId || "all";

  try {
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "messages:template-overview",
        params: { teamId: teamForKey(teamId), apiType },
        dateRange,
        liveness: "standard",
        query: request.query,
      },
      async () => {
        const [categoryOverview, templatePerformance] = await Promise.all([
          getTemplateCategoryOverview(orgId, teamId, dateRange, apiType),
          getTemplatePerformanceStats(orgId, teamId, dateRange, apiType),
        ]);
        return { categoryOverview, templatePerformance };
      },
    );

    reply.send(res);
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
  const dateRange = parseDateRangeParam(request.query.dateRange);
  try {
    const res = await cachedAnalytics(
      {
        orgId,
        endpoint: "messages:team-overview",
        params: { apiType },
        dateRange,
        liveness: "standard",
        query: request.query,
      },
      () => getTeamPerformanceStats(orgId, dateRange, apiType),
    );
    reply.send(res);
  } catch (e) {
    log.error({ err: e }, "Error fetching team api stats");
    reply.status(500).send({
      error: "An error occurred while fetching team api stats.",
    });
  }
}
