/**
 * Comment moderation for an Instagram account: list a post's comments, hide, delete,
 * like and reply to them.
 *
 * Meta's surface (Instagram API with Facebook Login, page access token):
 * - list:   `GET /{media-id}/comments` — paged with the `after` cursor.
 * - hide:   `POST /{comment-id}?hide=true|false` — `instagram_manage_comments`.
 * - delete: `DELETE /{comment-id}` — `instagram_manage_comments`.
 * - like:   `POST /{ig-user-id}/likes?comment_id=…`, unlike: `DELETE` on the same edge —
 *           `instagram_manage_engagement` (added 22 Apr 2026; reference: ig-user/user-likes).
 * - reply:  `POST /{comment-id}/replies` (replyToInstagramComment).
 */

import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { callMetaApi } from "../wa_axios.js";

/** One page of Graph's comments; replies are nested under their parent. */
export const COMMENTS_PAGE_SIZE = 25;

const COMMENT_FIELDS = "id,text,username,timestamp,like_count,hidden,from{id,username}";
const LIST_FIELDS = `${COMMENT_FIELDS},replies{${COMMENT_FIELDS}}`;

interface GraphComment {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  like_count?: number;
  hidden?: boolean;
  from?: { id?: string; username?: string };
  replies?: { data?: GraphComment[] };
}

export interface InstagramCommentReply {
  id: string;
  text: string;
  username: string | null;
  fromId: string | null;
  timestamp: string | null;
  likeCount: number;
  hidden: boolean;
  /** Written by the business account itself (a public reply from here or the app). */
  isOwn: boolean;
}

export interface InstagramComment extends InstagramCommentReply {
  /** A RateUp automation privately replied to this comment. */
  autoReplied: boolean;
  replies: InstagramCommentReply[];
}

export interface InstagramCommentsPage {
  comments: InstagramComment[];
  /** Pass back as `after` for the next page; null on the last page. */
  nextCursor: string | null;
}

function toReply(comment: GraphComment, ibaId: string): InstagramCommentReply {
  return {
    id: comment.id,
    text: comment.text ?? "",
    username: comment.username ?? comment.from?.username ?? null,
    fromId: comment.from?.id ?? null,
    timestamp: comment.timestamp ?? null,
    likeCount: comment.like_count ?? 0,
    hidden: comment.hidden ?? false,
    isOwn: comment.from?.id === ibaId,
  };
}

/**
 * The comment ids, out of `commentIds`, that a RateUp automation answered.
 *
 * Every automated private reply (rules, journeys, comment-to-buy) goes through
 * sendInstagramPrivateReply → sendMetaMessage, which stores the payload as sent:
 * `messageBody.send.recipient.comment_id`. That row is the one reliable trace.
 * A rule's *public* reply (replyToInstagramComment) is not recorded anywhere, so a
 * rule that only answers in public does not light the badge.
 */
export async function findAutoRepliedCommentIds(
  ibaId: string,
  commentIds: string[],
  since?: Date,
): Promise<Set<string>> {
  if (commentIds.length === 0) return new Set();
  const rows = await prisma.$queryRaw<{ commentId: string }[]>(Prisma.sql`
    SELECT DISTINCT "messageBody" #>> '{send,recipient,comment_id}' AS "commentId"
    FROM "WaMessage"
    WHERE "sourceIdentifier" = ${ibaId}
      AND "sourcePlatform" = 'INSTAGRAM'
      AND "messageId" IS NOT NULL
      ${since ? Prisma.sql`AND "createdAt" >= ${since}` : Prisma.empty}
      AND "messageBody" #>> '{send,recipient,comment_id}' = ANY(${commentIds}::text[])
  `);
  return new Set(rows.map((row) => row.commentId));
}

/** One page of a post's top-level comments, newest first as Graph orders them. */
export async function listInstagramComments(
  ibaId: string,
  pageAccessToken: string,
  mediaId: string,
  after?: string,
): Promise<InstagramCommentsPage> {
  const response = await callMetaApi(
    `/${mediaId}/comments`,
    "GET",
    pageAccessToken,
    undefined,
    {},
    {},
    { fields: LIST_FIELDS, limit: COMMENTS_PAGE_SIZE, ...(after ? { after } : {}) },
  );

  const data = (response.data?.data as GraphComment[] | undefined) ?? [];
  // Graph sends `paging.next` only when another page exists; the cursor alone is
  // present on the last page too.
  const paging = response.data?.paging as
    | { cursors?: { after?: string }; next?: string }
    | undefined;
  const nextCursor = paging?.next ? (paging.cursors?.after ?? null) : null;

  const ids = data.map((comment) => comment.id);
  const oldest = data
    .map((comment) => (comment.timestamp ? Date.parse(comment.timestamp) : NaN))
    .filter((time) => !Number.isNaN(time))
    .reduce<number | undefined>(
      (min, time) => (min === undefined || time < min ? time : min),
      undefined,
    );
  // A private reply is always sent after the comment it answers.
  const autoReplied = await findAutoRepliedCommentIds(
    ibaId,
    ids,
    oldest === undefined ? undefined : new Date(oldest),
  );

  return {
    comments: data.map((comment) => ({
      ...toReply(comment, ibaId),
      autoReplied: autoReplied.has(comment.id),
      replies: (comment.replies?.data ?? []).map((reply) => toReply(reply, ibaId)),
    })),
    nextCursor,
  };
}

/** Hides (or shows again) a comment. The author still sees it; everyone else does not. */
export async function setInstagramCommentHidden(
  pageAccessToken: string,
  commentId: string,
  hidden: boolean,
): Promise<void> {
  await callMetaApi(`/${commentId}`, "POST", pageAccessToken, undefined, {}, {}, { hide: hidden });
}

/** Deletes a comment for good. Only comments on the account's own media can be deleted. */
export async function deleteInstagramComment(
  pageAccessToken: string,
  commentId: string,
): Promise<void> {
  await callMetaApi(`/${commentId}`, "DELETE", pageAccessToken);
}

/**
 * Likes (or unlikes) a comment or reply as the business account. Facebook Login only.
 * Meta locks the account for an hour after more than 50 like requests in 5 s, so this is
 * only ever called for one comment a person clicked — never in a loop.
 */
export async function setInstagramCommentLiked(
  ibaId: string,
  pageAccessToken: string,
  commentId: string,
  liked: boolean,
): Promise<void> {
  await callMetaApi(
    `/${ibaId}/likes`,
    liked ? "POST" : "DELETE",
    pageAccessToken,
    undefined,
    {},
    {},
    { comment_id: commentId },
  );
}
