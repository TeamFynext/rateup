import { Alert, AlertDescription } from "@rateup/ui/components/alert";
import { Badge } from "@rateup/ui/components/badge";
import { Button } from "@rateup/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rateup/ui/components/empty";
import { Input } from "@rateup/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { Skeleton } from "@rateup/ui/components/skeleton";
import {
  IconCornerDownRight,
  IconEye,
  IconEyeOff,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconRobot,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  InstagramComment,
  InstagramCommentReply,
} from "@/backend/whatsapp/instagram-comments/instagramComments.api";
import {
  useDeleteInstagramComment,
  useInstagramCommentAction,
  useInstagramComments,
  useReplyToInstagramComment,
} from "@/backend/whatsapp/instagram-comments/instagramComments.query";
import { useInstagramMediaPosts } from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import { ChannelSection } from "@/components/dashboard/meta-channels/ChannelSection.tsx";
import TimeSinceText from "@/components/DateAndTime/TimeSinceText.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

interface RowProps {
  ibaId: string;
  mediaId: string;
  comment: InstagramCommentReply;
  /** Likes this session; Graph does not say whether the account already liked a comment. */
  liked: boolean;
  onLikedChange: (commentId: string, liked: boolean) => void;
  autoReplied?: boolean;
  isReply?: boolean;
}

/** One comment or reply: who, what, when, and the moderation actions. */
function CommentRow({
  ibaId,
  mediaId,
  comment,
  liked,
  onLikedChange,
  autoReplied,
  isReply,
}: Readonly<RowProps>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const canReply = useCan("inbox.reply");
  const canDelete = useCan("inbox.delete");
  const action = useInstagramCommentAction(ibaId, mediaId);
  const reply = useReplyToInstagramComment(ibaId, mediaId);
  const remove = useDeleteInstagramComment(ibaId, mediaId);
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");

  const pending = (kind: string) =>
    action.isPending &&
    action.variables?.commentId === comment.id &&
    action.variables.action === kind;

  const toggleLike = () => {
    const next = !liked;
    action.mutate(
      { commentId: comment.id, action: next ? "like" : "unlike" },
      { onSuccess: () => onLikedChange(comment.id, next) },
    );
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: t("Delete comment"),
      description: t("The comment is removed from Instagram for everyone. This can't be undone."),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });
    if (ok) remove.mutate(comment.id);
  };

  const sendReply = () => {
    const value = text.trim();
    if (!value) return;
    reply.mutate(
      { commentId: comment.id, text: value },
      {
        onSuccess: () => {
          setText("");
          setReplying(false);
        },
      },
    );
  };

  const author = comment.isOwn
    ? t("You")
    : comment.username
      ? `@${comment.username}`
      : t("Instagram user");

  return (
    <div className={isReply ? "flex gap-2 pl-6" : "flex gap-2"}>
      {isReply ? (
        <IconCornerDownRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{author}</span>
          {comment.timestamp ? <TimeSinceText isoDateString={comment.timestamp} /> : null}
          {comment.likeCount > 0 ? (
            <span className="tabular-nums">
              {t("{count, plural, one {# like} other {# likes}}", { count: comment.likeCount })}
            </span>
          ) : null}
          {comment.hidden ? (
            <Badge variant="outline">
              <IconEyeOff data-icon="inline-start" />
              {t("Hidden")}
            </Badge>
          ) : null}
          {autoReplied ? (
            <Badge variant="secondary">
              <IconRobot data-icon="inline-start" />
              {t("Auto-replied")}
            </Badge>
          ) : null}
        </div>
        <p
          className={
            comment.hidden
              ? "text-sm break-words whitespace-pre-wrap text-muted-foreground"
              : "text-sm break-words whitespace-pre-wrap"
          }
        >
          {comment.text}
        </p>
        {canReply || canDelete ? (
          <div className="flex flex-wrap items-center gap-1">
            {canReply ? (
              <>
                {comment.isOwn ? null : (
                  <Button
                    variant="ghost"
                    size="xs"
                    loading={pending("like") || pending("unlike")}
                    onClick={toggleLike}
                  >
                    {liked ? (
                      <IconHeartFilled data-icon="inline-start" className="text-destructive" />
                    ) : (
                      <IconHeart data-icon="inline-start" />
                    )}
                    {liked ? t("Unlike") : t("Like")}
                  </Button>
                )}
                {isReply ? null : (
                  <Button variant="ghost" size="xs" onClick={() => setReplying((v) => !v)}>
                    <IconMessageCircle data-icon="inline-start" />
                    {t("Reply")}
                  </Button>
                )}
                {comment.isOwn ? null : (
                  <Button
                    variant="ghost"
                    size="xs"
                    loading={pending("hide") || pending("unhide")}
                    onClick={() =>
                      action.mutate({
                        commentId: comment.id,
                        action: comment.hidden ? "unhide" : "hide",
                      })
                    }
                  >
                    {comment.hidden ? (
                      <IconEye data-icon="inline-start" />
                    ) : (
                      <IconEyeOff data-icon="inline-start" />
                    )}
                    {comment.hidden ? t("Unhide") : t("Hide")}
                  </Button>
                )}
              </>
            ) : null}
            {canDelete ? (
              <Button
                variant="ghost"
                size="xs"
                className="text-destructive"
                loading={remove.isPending}
                onClick={() => void onDelete()}
              >
                <IconTrash data-icon="inline-start" />
                {t("Delete")}
              </Button>
            ) : null}
          </div>
        ) : null}
        {replying ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              sendReply();
            }}
          >
            <Input
              autoFocus
              value={text}
              maxLength={2200}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("Write a public reply…")}
              aria-label={t("Reply to {name}", { name: author })}
            />
            <Button type="submit" size="sm" loading={reply.isPending} disabled={!text.trim()}>
              <IconSend data-icon="inline-start" />
              {t("Reply")}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function CommentThread({
  ibaId,
  mediaId,
  comment,
  likedIds,
  onLikedChange,
}: Readonly<{
  ibaId: string;
  mediaId: string;
  comment: InstagramComment;
  likedIds: ReadonlySet<string>;
  onLikedChange: (commentId: string, liked: boolean) => void;
}>) {
  return (
    <li className="space-y-3 px-4 py-3">
      <CommentRow
        ibaId={ibaId}
        mediaId={mediaId}
        comment={comment}
        liked={likedIds.has(comment.id)}
        onLikedChange={onLikedChange}
        autoReplied={comment.autoReplied}
      />
      {comment.replies.map((reply) => (
        <CommentRow
          key={reply.id}
          ibaId={ibaId}
          mediaId={mediaId}
          comment={reply}
          liked={likedIds.has(reply.id)}
          onLikedChange={onLikedChange}
          isReply
        />
      ))}
    </li>
  );
}

function CommentList({ ibaId, mediaId }: Readonly<{ ibaId: string; mediaId: string }>) {
  const { t } = useTranslation();
  const query = useInstagramComments(ibaId, mediaId);
  const [likedIds, setLikedIds] = useState<ReadonlySet<string>>(new Set());
  const onLikedChange = (commentId: string, liked: boolean) =>
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.add(commentId);
      else next.delete(commentId);
      return next;
    });

  if (query.isPending) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {getApiErrorMessage(query.error, t("Could not load the comments"))}
        </AlertDescription>
      </Alert>
    );
  }

  const comments = query.data.pages.flatMap((page) => page.comments);
  if (comments.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMessageCircle className="size-5" />
          </EmptyMedia>
          <EmptyTitle>{t("No comments on this post")}</EmptyTitle>
          <EmptyDescription>{t("New comments show up here as people post them.")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {comments.map((comment) => (
          <CommentThread
            key={comment.id}
            ibaId={ibaId}
            mediaId={mediaId}
            comment={comment}
            likedIds={likedIds}
            onLikedChange={onLikedChange}
          />
        ))}
      </ul>
      {query.hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="self-center"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("Load more")}
        </Button>
      ) : null}
    </div>
  );
}

/** Read and moderate the comments on one of the account's posts. */
export function CommentModerationSection({ ibaId }: Readonly<{ ibaId: string }>) {
  const { t } = useTranslation();
  const { data: posts, isPending, isError, error } = useInstagramMediaPosts(ibaId);
  const [picked, setPicked] = useState<string>();
  // The newest post until the user picks one; a pick from another account no longer matches.
  const mediaId = posts?.find((p) => p.id === picked)?.id ?? posts?.[0]?.id;

  const items = (posts ?? []).map((post) => ({
    value: post.id,
    label: post.caption
      ? `${post.caption.slice(0, 60)}${post.caption.length > 60 ? "…" : ""}`
      : `${post.media_type} · ${new Date(post.timestamp).toLocaleDateString()}`,
  }));

  return (
    <ChannelSection
      icon={IconMessageCircle}
      title={t("Comments")}
      description={t("Reply to, like, hide or delete the comments on your posts.")}
    >
      {isPending ? (
        <Skeleton className="h-9 w-full rounded-md" />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {getApiErrorMessage(error, t("Could not load your posts"))}
          </AlertDescription>
        </Alert>
      ) : !mediaId ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconMessageCircle className="size-5" />
            </EmptyMedia>
            <EmptyTitle>{t("No posts yet")}</EmptyTitle>
            <EmptyDescription>
              {t("Comments appear here once the account has published a post or reel.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Select
            value={mediaId}
            onValueChange={(value) => setPicked(value ?? undefined)}
            items={items}
          >
            <SelectTrigger aria-label={t("Post")} className="w-full">
              <SelectValue placeholder={t("Pick a post")} />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CommentList key={mediaId} ibaId={ibaId} mediaId={mediaId} />
        </>
      )}
    </ChannelSection>
  );
}
