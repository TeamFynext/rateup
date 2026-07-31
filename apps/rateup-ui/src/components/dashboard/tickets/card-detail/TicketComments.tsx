// Extracted verbatim from `CardDetailPage.tsx`. Behaviour is unchanged.

import parse from "html-react-parser";
import { Trash, User } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  useCreateCommentMutation,
  useDeleteCommentMutation,
} from "@/backend/tickets/tickets.query";
import TicketTextEditor from "@/components/RichTextEditor/TicketTextEditor.tsx";
import type { TicketComment } from "@/components/Tickets/types.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext.tsx";
import { formatToRelativeTime } from "@/utils/dateTime.ts";

export function TicketComments({
  data,
  ticketCardId,
}: Readonly<{
  data: Array<TicketComment>;
  ticketCardId: string;
}>) {
  const { t } = useTranslation();
  const { mutate } = useCreateCommentMutation(ticketCardId);
  const handleAddComment = (comment: string) => {
    mutate({ msg: comment, ticketCardId });
  };
  return (
    <div className="flex flex-col gap-6 mt-1">
      <div className="flex gap-4 items-start">
        <Avatar className="h-8 w-8 mt-1">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <TicketTextEditor
            onUpdate={handleAddComment}
            content={""}
            placeholder={t("Add a comment...")}
            saveBtn
          />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {data.map((comment) => (
          <Comment {...comment} key={comment?.id} cardId={ticketCardId} />
        ))}
      </div>
    </div>
  );
}

export function Comment(data: TicketComment & { cardId: string }) {
  const { user } = useUser();
  const { mutate, isPending } = useDeleteCommentMutation(data.cardId);
  if (!data) return null;
  return (
    <div className="flex gap-4 items-start group">
      <Avatar className="h-8 w-8">
        <AvatarImage src={data?.createdBy?.profilePhoto ?? ""} />
        <AvatarFallback>{data?.createdBy?.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold capitalize">{data.createdBy?.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatToRelativeTime(data.createdAt)}
          </span>
        </div>
        <div className="text-sm text-foreground bg-muted/40 border rounded-tl-sm rounded-tr-xl rounded-br-xl rounded-bl-xl px-3 py-2 leading-relaxed">
          {parse(data.text)}
        </div>
      </div>
      {data?.createdById === user?.userId && (
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive"
          disabled={isPending}
          onClick={() => mutate(data.id)}
        >
          <Trash className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
