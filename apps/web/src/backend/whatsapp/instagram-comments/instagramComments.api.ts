import { WHATSAPP_URL } from "..";
import { axiosClient } from "../../apiClient";

/** Mirrors rateup-api's InstagramCommentReply (instagram_comments.service.ts). */
export interface InstagramCommentReply {
  id: string;
  text: string;
  username: string | null;
  fromId: string | null;
  timestamp: string | null;
  likeCount: number;
  hidden: boolean;
  /** Written by the business account itself. */
  isOwn: boolean;
}

export interface InstagramComment extends InstagramCommentReply {
  /** A RateUp automation privately replied to this comment. */
  autoReplied: boolean;
  replies: InstagramCommentReply[];
}

export interface InstagramCommentsPage {
  comments: InstagramComment[];
  nextCursor: string | null;
}

export type InstagramCommentAction = "hide" | "unhide" | "like" | "unlike";

const commentsUrl = (ibaId: string, mediaId: string) =>
  `${WHATSAPP_URL}/instagram/${ibaId}/media/${mediaId}/comments`;

export async function getInstagramComments(ibaId: string, mediaId: string, after?: string) {
  const res = await axiosClient.get(commentsUrl(ibaId, mediaId), {
    params: after ? { after } : undefined,
  });
  return (res.data as { success: boolean; data: InstagramCommentsPage }).data;
}

export async function runInstagramCommentAction(
  ibaId: string,
  mediaId: string,
  commentId: string,
  action: InstagramCommentAction,
) {
  return axiosClient.post(`${commentsUrl(ibaId, mediaId)}/${commentId}/${action}`);
}

export async function replyToInstagramComment(
  ibaId: string,
  mediaId: string,
  commentId: string,
  text: string,
) {
  return axiosClient.post(`${commentsUrl(ibaId, mediaId)}/${commentId}/reply`, { text });
}

export async function deleteInstagramComment(ibaId: string, mediaId: string, commentId: string) {
  return axiosClient.delete(`${commentsUrl(ibaId, mediaId)}/${commentId}`);
}
