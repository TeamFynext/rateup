import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import {
  getDeliveredFailedTrend,
  getDeliveredFailedWeekTrend,
  getTeamPerformanceStats,
  getTemplateCategoryOverview,
  getTemplatePerformanceStats,
  getWaMessageOverview,
} from "./apianalytics.service.js";
import { StatsQuerySchema, TrendQuerySchema } from "./apianalytics.schema.js";

/**
 * The two ends of the range, or undefined when the caller named none.
 *
 * Every handler parses it the same way now. Two of them used to pass `[]` and two
 * `undefined` for an absent range; that made no difference on its own, but it was
 * the surface of a real split — the services behind them defaulted an absent range
 * differently. See issues.txt 15.1.
 */
function parseDateRange(dateRange: string | undefined): [string, string] | undefined {
  const parts = dateRange?.split(",") ?? [];
  return parts.length === 2 ? [parts[0], parts[1]] : undefined;
}

/**
 * teamId is a filter the caller picks, not a boundary the server enforces, and
 * these routes carry `checkSession` and nothing else. That is deliberate and
 * matches the policy stated in wa_channel_access.ts: team scoping "drives what the
 * dashboard shows, not what the API allows". Every query below still filters on
 * the caller's own orgId, so this is never cross-tenant. See issues.txt 15.7.
 */
export async function getApiAnalyticsHandler(
  request: FastifyRequest<{
    Querystring: StatsQuerySchema;
  }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const dateRange = parseDateRange(request.query.dateRange);
  const teamId = request.query?.teamId;
  const apiType = request.query?.apiType ?? "all";
  try {
    const res = await getWaMessageOverview(orgId, teamId, dateRange, apiType);
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
  const dateRange = parseDateRange(request.query.dateRange);

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
  const dateRange = parseDateRange(request.query.dateRange);
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
  const dateRange = parseDateRange(request.query.dateRange);
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
