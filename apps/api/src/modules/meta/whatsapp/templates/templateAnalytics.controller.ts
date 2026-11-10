import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../../../utils/logger.js";
import { HttpError } from "../../../../utils/http.js";
import { GraphApiError } from "../wa_axios.js";
import { getGraphApiErrorMessage } from "../wa_error_handler.js";
import type {
  TemplateAnalyticsAccount,
  TemplateAnalyticsQuery,
} from "./templateAnalytics.schema.js";
import {
  enableInsights,
  getInsightsStatus,
  getTemplateAnalytics,
} from "./templateAnalytics.service.js";

function sendError(reply: FastifyReply, e: unknown, fallback: string) {
  if (e instanceof HttpError) return reply.code(e.statusCode).send({ message: e.message });
  if (e instanceof GraphApiError) {
    return reply.code(400).send({ message: getGraphApiErrorMessage(e) ?? fallback });
  }
  return reply.code(500).send({ message: fallback });
}

export async function getTemplateAnalyticsHandler(
  request: FastifyRequest<{ Querystring: TemplateAnalyticsQuery }>,
  reply: FastifyReply,
) {
  try {
    return reply.send(await getTemplateAnalytics(request.user.orgId, request.query));
  } catch (e) {
    log.error({ err: e }, "Error fetching template analytics from Meta");
    return sendError(reply, e, "Couldn't load template analytics from Meta");
  }
}

export async function getTemplateInsightsStatusHandler(
  request: FastifyRequest<{ Querystring: TemplateAnalyticsAccount }>,
  reply: FastifyReply,
) {
  try {
    const status = await getInsightsStatus(request.user.orgId, request.query.phoneId);
    return reply.send({ status });
  } catch (e) {
    return sendError(reply, e, "Couldn't check template analytics");
  }
}

export async function enableTemplateInsightsHandler(
  request: FastifyRequest<{ Body: TemplateAnalyticsAccount }>,
  reply: FastifyReply,
) {
  try {
    await enableInsights(request.user.orgId, request.body.phoneId);
    return reply.send({ status: "enabled" });
  } catch (e) {
    log.error({ err: e }, "Error enabling template analytics");
    return sendError(reply, e, "Couldn't turn on template analytics");
  }
}
