import { FastifyInstance } from "fastify";

import { declareAccess } from "../../../authz/registry.js";
import {
  deleteInstagramCommentHandler,
  hideInstagramCommentHandler,
  likeInstagramCommentHandler,
  listInstagramCommentsHandler,
  replyToInstagramCommentHandler,
  unhideInstagramCommentHandler,
  unlikeInstagramCommentHandler,
} from "./instagram_comments.controller.js";
import {
  instagramCommentParamsSchema,
  instagramCommentReplyBodySchema,
  instagramCommentsQuerySchema,
  instagramMediaCommentsParamsSchema,
} from "./instagram_comments.schema.js";

/**
 * Comment moderation, mounted at `/instagram`. Comments are customer conversations, so
 * this follows the inbox's permissions: reading needs `inbox.read`, answering, hiding and
 * liking `inbox.reply`, and deleting — which cannot be undone — `inbox.delete`.
 */
export async function instagramCommentsRoutes(server: FastifyInstance) {
  declareAccess(server, { read: "inbox.read", write: "inbox.reply" });

  const params = instagramCommentParamsSchema;
  const base = "/:ibaId/media/:mediaId/comments";

  server.get(
    base,
    {
      schema: {
        params: instagramMediaCommentsParamsSchema,
        querystring: instagramCommentsQuerySchema,
      },
    },
    listInstagramCommentsHandler,
  );
  server.post(`${base}/:commentId/hide`, { schema: { params } }, hideInstagramCommentHandler);
  server.post(`${base}/:commentId/unhide`, { schema: { params } }, unhideInstagramCommentHandler);
  server.post(`${base}/:commentId/like`, { schema: { params } }, likeInstagramCommentHandler);
  server.post(`${base}/:commentId/unlike`, { schema: { params } }, unlikeInstagramCommentHandler);
  server.post(
    `${base}/:commentId/reply`,
    { schema: { params, body: instagramCommentReplyBodySchema } },
    replyToInstagramCommentHandler,
  );
  server.delete(
    `${base}/:commentId`,
    { schema: { params }, config: { permission: "inbox.delete" } },
    deleteInstagramCommentHandler,
  );
}
