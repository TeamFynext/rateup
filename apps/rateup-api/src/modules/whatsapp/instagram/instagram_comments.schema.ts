import { z } from "zod";

/**
 * Instagram ids are numeric strings. They are interpolated into Graph paths, so anything
 * else is refused here rather than letting `../` or a query string through.
 */
const graphId = z.string().regex(/^\d{1,40}$/, "Must be an Instagram id");

export const instagramMediaCommentsParamsSchema = z.object({
  ibaId: graphId,
  mediaId: graphId,
});

export const instagramCommentParamsSchema = instagramMediaCommentsParamsSchema.extend({
  commentId: graphId,
});

export const instagramCommentsQuerySchema = z.object({
  /** Graph's opaque `after` cursor from the previous page. */
  after: z.string().min(1).max(1000).optional(),
});

export const instagramCommentReplyBodySchema = z.object({
  // Instagram caps a comment at 2,200 characters.
  text: z.string().trim().min(1).max(2200),
});

export type InstagramMediaCommentsParams = z.infer<typeof instagramMediaCommentsParamsSchema>;
export type InstagramCommentParams = z.infer<typeof instagramCommentParamsSchema>;
export type InstagramCommentsQuery = z.infer<typeof instagramCommentsQuerySchema>;
export type InstagramCommentReplyBody = z.infer<typeof instagramCommentReplyBodySchema>;
