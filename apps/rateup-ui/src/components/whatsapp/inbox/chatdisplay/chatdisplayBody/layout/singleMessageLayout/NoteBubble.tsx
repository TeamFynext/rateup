import { IconDots, IconLock, IconPencil, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { WaGetMessagesBody } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  useDeletePrivateNote,
  useEditPrivateNote,
} from "@/backend/whatsapp/inbox/message/wamessage.query";
import { Bubble, BubbleContent } from "@/components/ui/bubble.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Message, MessageContent, MessageHeader } from "@/components/ui/message.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { useCan } from "@/hooks/usePermission.ts";
import { useMessagesStore } from "@/store/inbox.store.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { formatToCustomTime } from "@/utils/dateTime.ts";

import WaInboxText from "../../components/text/index.tsx";

/** A private note in the thread: amber, centred, signed, and editable by its author. */
export default function NoteBubble({ note }: Readonly<{ note: WaGetMessagesBody }>) {
  const { t } = useTranslation();
  const { user } = useUser();
  const confirm = useConfirm();
  const canManageInbox = useCan("inbox.manage");
  const patchMessageEverywhere = useMessagesStore((state) => state.patchMessageEverywhere);
  const editNote = useEditPrivateNote();
  const deleteNote = useDeletePrivateNote();
  const [draft, setDraft] = useState<string | null>(null);

  const body = note.messageBody.privateNote;
  const text = body?.text.body ?? "";
  const author = note.sender?.name || body?.triggeredByUser?.name || t("A teammate");
  const isDeleted = Boolean(note.deletedAt);
  // The composer's placeholder has no server row to edit until the save returns.
  const isSaved = !note.id.startsWith("wamid.");
  const isAuthor = Boolean(user?.userId) && note.sendBy === user?.userId;
  const canEdit = isSaved && !isDeleted && isAuthor;
  const canDelete = isSaved && !isDeleted && (isAuthor || canManageInbox);

  // Both clients key a note by its messageId; the server echoes that back unchanged.
  function applyServerNote(saved: WaGetMessagesBody) {
    patchMessageEverywhere(saved.messageId ?? saved.id, {
      messageBody: saved.messageBody,
      deletedAt: saved.deletedAt,
    });
  }

  function saveEdit() {
    if (draft === null || !draft.trim() || draft === text) {
      setDraft(null);
      return;
    }
    editNote.mutate(
      { noteId: note.id, text: { body: draft } },
      {
        onSuccess: (saved) => {
          applyServerNote(saved);
          setDraft(null);
        },
        onError: (error) => toast.error(getApiErrorMessage(error, t("The note wasn't saved."))),
      },
    );
  }

  function handleEditKeys(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") setDraft(null);
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      saveEdit();
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: t("Delete note"),
      description: t("The note is removed for everyone on the team."),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });
    if (!ok) return;
    deleteNote.mutate(note.id, {
      onSuccess: applyServerNote,
      onError: (error) => toast.error(getApiErrorMessage(error, t("The note wasn't deleted."))),
    });
  }

  return (
    <Message align="center">
      <MessageContent className="group/note max-w-[78%]">
        <MessageHeader className="gap-1.5 text-[10px] font-extrabold tracking-wider uppercase">
          <IconLock className="size-3 shrink-0" />
          <span className="truncate">
            {t("Internal note")} · {author} · {formatToCustomTime(note.waCreatedAt)}
            {body?.editedAt && !isDeleted && ` · ${t("edited")}`}
          </span>
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("Note actions")}
                    className="size-5 opacity-0 group-hover/note:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                  />
                }
              >
                <IconDots className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem className="gap-2 text-xs" onClick={() => setDraft(text)}>
                    <IconPencil className="size-4" />
                    {t("Edit")}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    className="gap-2 text-xs"
                    onClick={handleDelete}
                  >
                    <IconTrash className="size-4" />
                    {t("Delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </MessageHeader>
        <Bubble variant="note" className="max-w-full">
          <BubbleContent>
            {isDeleted ? (
              <span className="text-sm italic opacity-70">
                {body?.deletedBy?.name
                  ? t("Note deleted by {name}", { name: body.deletedBy.name })
                  : t("Note deleted")}
              </span>
            ) : draft !== null ? (
              <div className="flex min-w-60 flex-col gap-2">
                <Textarea
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleEditKeys}
                  aria-label={t("Edit note")}
                  className="min-h-12 bg-background"
                />
                <div className="flex justify-end gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                    {t("Cancel")}
                  </Button>
                  <Button size="sm" onClick={saveEdit} loading={editNote.isPending}>
                    {t("Save")}
                  </Button>
                </div>
              </div>
            ) : (
              <WaInboxText
                messageContent={text}
                mentions={(body?.mentionedUser ?? []).map((u) => u.name)}
              />
            )}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
