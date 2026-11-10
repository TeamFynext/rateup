import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../../utils/logger.js";
import {
  getAccountInsights,
  getPostsReport,
  InstagramChannelNotFoundError,
  isPermissionError,
} from "./instagram_insights.service.js";
import type {
  InstagramInsightsParams,
  InstagramInsightsQuery,
} from "./instagram_insights.schema.js";

type InsightsRequest = FastifyRequest<{
  Params: InstagramInsightsParams;
  Querystring: InstagramInsightsQuery;
}>;

/** What the dashboard keys its "Reconnect Instagram" alert on. */
export const INSIGHTS_PERMISSION_CODE = "instagram_insights_permission";

function replyForError(reply: FastifyReply, error: unknown, fallback: string) {
  if (error instanceof InstagramChannelNotFoundError) {
    return reply.code(404).send({ success: false, message: error.message });
  }
  if (isPermissionError(error)) {
    // 409, not 403: a 403 reads as "your role may not", and this is the token, not the user.
    return reply.code(409).send({
      success: false,
      code: INSIGHTS_PERMISSION_CODE,
      message: "Reconnect Instagram to allow insights",
    });
  }
  log.error({ err: error }, `[Instagram Insights] ${fallback}`);
  return reply.code(500).send({ success: false, message: fallback });
}

export async function getInstagramAccountInsightsHandler(
  request: InsightsRequest,
  reply: FastifyReply,
) {
  try {
    const data = await getAccountInsights(
      request.params.ibaId,
      request.user.orgId,
      request.query.range,
      { fresh: Boolean(request.query.fresh) },
    );
    return reply.send({ success: true, data });
  } catch (error) {
    return replyForError(reply, error, "Failed to load Instagram account insights");
  }
}

export async function getInstagramPostsInsightsHandler(
  request: InsightsRequest,
  reply: FastifyReply,
) {
  try {
    const data = await getPostsReport(
      request.params.ibaId,
      request.user.orgId,
      request.query.range,
      { fresh: Boolean(request.query.fresh) },
    );
    return reply.send({ success: true, data });
  } catch (error) {
    return replyForError(reply, error, "Failed to load Instagram post insights");
  }
}
