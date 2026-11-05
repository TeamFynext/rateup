import { FastifyReply, FastifyRequest } from "fastify";

import { log } from "../../../utils/logger.js";
import { getInstagramChannel } from "../metaChannel/metaChannel.service.js";
import { getChannelScope } from "../settings/wa_channel_access.js";
import { getGraphApiErrorMessage } from "../wa_error_handler.js";
import { GraphApiError } from "../wa_axios.js";
import {
  deleteInstagramComment,
  listInstagramComments,
  setInstagramCommentHidden,
  setInstagramCommentLiked,
} from "./instagram_comments.service.js";
import type {
  InstagramCommentParams,
  InstagramCommentReplyBody,
  InstagramCommentsQuery,
  InstagramMediaCommentsParams,
} from "./instagram_comments.schema.js";
import { replyToInstagramComment } from "./instagram_messaging.service.js";

export const RECONNECT_FOR_MODERATION_MESSAGE = "Reconnect Instagram to grant comment moderation";

/**
 * The org's Instagram account, with a token, that this actor's teams reach; null otherwise.
 * Scoped by org first: comment ids carry no org, so the account is what ties them to one.
 */
async function resolveChannel(request: FastifyRequest, ibaId: string) {
  const { orgId } = request.user;
  const channel = await getInstagramChannel(ibaId, orgId);
  if (!channel || channel.orgId !== orgId || !channel.pageAccessToken) return null;
  if (request.actor) {
    const scope = await getChannelScope(request.actor);
    if (!scope.all && !scope.ids.has(channel.id)) return null;
  }
  return { ...channel, pageAccessToken: channel.pageAccessToken };
}

/**
 * Graph errors as the dashboard should read them. A missing permission (10, 200–299) or a
 * dead token (190) can only be fixed by reconnecting, which is what the message says.
 */
export function replyForGraphError(reply: FastifyReply, error: unknown, fallbackMessage: string) {
  if (error instanceof GraphApiError) {
    const code = error.error?.code;
    if (code === 190 || code === 10 || (code >= 200 && code <= 299)) {
      return reply.code(403).send({
        success: false,
        code: "reconnect_required",
        message: RECONNECT_FOR_MODERATION_MESSAGE,
      });
    }
    // "Unsupported request — object does not exist": deleted, or not this account's.
    if (code === 100 && error.error?.error_subcode === 33) {
      return reply
        .code(404)
        .send({ success: false, message: "This comment no longer exists on Instagram" });
    }
    return reply.code(400).send({ success: false, message: getGraphApiErrorMessage(error) });
  }
  return reply.code(500).send({ success: false, message: fallbackMessage });
}

function notFound(reply: FastifyReply) {
  return reply.code(404).send({ success: false, message: "Instagram account not found" });
}

export async function listInstagramCommentsHandler(
  request: FastifyRequest<{
    Params: InstagramMediaCommentsParams;
    Querystring: InstagramCommentsQuery;
  }>,
  reply: FastifyReply,
) {
  const { ibaId, mediaId } = request.params;
  const channel = await resolveChannel(request, ibaId);
  if (!channel) return notFound(reply);
  try {
    const data = await listInstagramComments(
      ibaId,
      channel.pageAccessToken,
      mediaId,
      request.query.after,
    );
    return reply.code(200).send({ success: true, data });
  } catch (error) {
    log.error({ err: error, ibaId, mediaId }, "[Instagram Comments] Error listing comments");
    return replyForGraphError(reply, error, "Failed to load Instagram comments");
  }
}

function hiddenHandler(hidden: boolean) {
  return async function (
    request: FastifyRequest<{ Params: InstagramCommentParams }>,
    reply: FastifyReply,
  ) {
    const { ibaId, commentId } = request.params;
    const channel = await resolveChannel(request, ibaId);
    if (!channel) return notFound(reply);
    try {
      await setInstagramCommentHidden(channel.pageAccessToken, commentId, hidden);
      return reply.code(200).send({ success: true, data: { id: commentId, hidden } });
    } catch (error) {
      log.error({ err: error, ibaId, commentId, hidden }, "[Instagram Comments] Error hiding");
      return replyForGraphError(reply, error, "Failed to update the comment");
    }
  };
}

function likedHandler(liked: boolean) {
  return async function (
    request: FastifyRequest<{ Params: InstagramCommentParams }>,
    reply: FastifyReply,
  ) {
    const { ibaId, commentId } = request.params;
    const channel = await resolveChannel(request, ibaId);
    if (!channel) return notFound(reply);
    try {
      await setInstagramCommentLiked(ibaId, channel.pageAccessToken, commentId, liked);
      return reply.code(200).send({ success: true, data: { id: commentId, liked } });
    } catch (error) {
      log.error({ err: error, ibaId, commentId, liked }, "[Instagram Comments] Error liking");
      return replyForGraphError(reply, error, "Failed to update the like");
    }
  };
}

export const hideInstagramCommentHandler = hiddenHandler(true);
export const unhideInstagramCommentHandler = hiddenHandler(false);
export const likeInstagramCommentHandler = likedHandler(true);
export const unlikeInstagramCommentHandler = likedHandler(false);

export async function deleteInstagramCommentHandler(
  request: FastifyRequest<{ Params: InstagramCommentParams }>,
  reply: FastifyReply,
) {
  const { ibaId, commentId } = request.params;
  const channel = await resolveChannel(request, ibaId);
  if (!channel) return notFound(reply);
  try {
    await deleteInstagramComment(channel.pageAccessToken, commentId);
    return reply.code(200).send({ success: true, data: { id: commentId } });
  } catch (error) {
    log.error({ err: error, ibaId, commentId }, "[Instagram Comments] Error deleting comment");
    return replyForGraphError(reply, error, "Failed to delete the comment");
  }
}

export async function replyToInstagramCommentHandler(
  request: FastifyRequest<{ Params: InstagramCommentParams; Body: InstagramCommentReplyBody }>,
  reply: FastifyReply,
) {
  const { ibaId, commentId } = request.params;
  const channel = await resolveChannel(request, ibaId);
  if (!channel) return notFound(reply);
  try {
    const result = await replyToInstagramComment(commentId, request.body.text, ibaId);
    return reply.code(200).send({ success: true, data: { id: result.id ?? null } });
  } catch (error) {
    log.error({ err: error, ibaId, commentId }, "[Instagram Comments] Error replying to comment");
    return replyForGraphError(reply, error, "Failed to post the reply");
  }
}
