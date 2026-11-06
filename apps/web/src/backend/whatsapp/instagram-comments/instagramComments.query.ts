import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/utils/apiError.ts";

import {
  deleteInstagramComment,
  getInstagramComments,
  type InstagramCommentAction,
  type InstagramCommentsPage,
  replyToInstagramComment,
  runInstagramCommentAction,
} from "./instagramComments.api";

export const instagramCommentKeys = {
  all: ["instagramComments"] as const,
  byMedia: (ibaId: string, mediaId: string) => ["instagramComments", ibaId, mediaId] as const,
};

/** A post's comments, a page at a time ("Load more" calls fetchNextPage). */
export const useInstagramComments = (ibaId: string, mediaId?: string) =>
  useInfiniteQuery({
    queryKey: instagramCommentKeys.byMedia(ibaId, mediaId ?? ""),
    queryFn: ({ pageParam }) => getInstagramComments(ibaId, mediaId ?? "", pageParam || undefined),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(ibaId && mediaId),
    staleTime: 30 * 1000,
  });

type CommentsData = InfiniteData<InstagramCommentsPage, string>;

/** Flips `hidden` on the cached comment (or reply) so the row updates before Meta answers. */
function patchHidden(data: CommentsData | undefined, commentId: string, hidden: boolean) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      comments: page.comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, hidden }
          : {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === commentId ? { ...reply, hidden } : reply,
              ),
            },
      ),
    })),
  };
}

export const useInstagramCommentAction = (ibaId: string, mediaId: string) => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const key = instagramCommentKeys.byMedia(ibaId, mediaId);

  return useMutation({
    mutationFn: ({ commentId, action }: { commentId: string; action: InstagramCommentAction }) =>
      runInstagramCommentAction(ibaId, mediaId, commentId, action),
    onMutate: async ({ commentId, action }) => {
      if (action !== "hide" && action !== "unhide") return undefined;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CommentsData>(key);
      qc.setQueryData<CommentsData>(key, (data) => patchHidden(data, commentId, action === "hide"));
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
      toast.error(getApiErrorMessage(error, t("Could not update the comment")));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
};

export const useReplyToInstagramComment = (ibaId: string, mediaId: string) => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ commentId, text }: { commentId: string; text: string }) =>
      replyToInstagramComment(ibaId, mediaId, commentId, text),
    onSuccess: () => {
      toast.success(t("Reply posted"));
      return qc.invalidateQueries({ queryKey: instagramCommentKeys.byMedia(ibaId, mediaId) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t("Could not post the reply"))),
  });
};

export const useDeleteInstagramComment = (ibaId: string, mediaId: string) => {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (commentId: string) => deleteInstagramComment(ibaId, mediaId, commentId),
    onSuccess: () => {
      toast.success(t("Comment deleted"));
      return qc.invalidateQueries({ queryKey: instagramCommentKeys.byMedia(ibaId, mediaId) });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t("Could not delete the comment"))),
  });
};
