import { IconPencil, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateLeadNoteMutation,
  useDeleteLeadNoteMutation,
  useUpdateLeadNoteMutation,
} from "@/backend/pipeline/pipeline.query.tsx";
import type { LeadNote } from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { formatToRelativeTime } from "@/utils/dateTime.ts";

import { LeadAvatar } from "../shared/LeadAvatar.tsx";
import { submitOnEnter } from "../shared/submitOnEnter.ts";

/** Saves within this long of creation are the create itself, not an edit. */
const EDIT_GRACE_MS = 60_000;

function NoteItem({
  note,
  currentUserId,
}: Readonly<{ note: LeadNote; currentUserId: string | undefined }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const updateNote = useUpdateLeadNoteMutation();
  const deleteNote = useDeleteLeadNoteMutation();
  const [draft, setDraft] = useState<string | null>(null);

  // The API refuses anyone else's edit; this only keeps the control honest.
  const isAuthor = Boolean(currentUserId && note.authorId === currentUserId);
  const edited = dayjs(note.updatedAt).diff(note.createdAt) > EDIT_GRACE_MS;

  const save = () => {
    const text = draft?.trim();
    if (!text || updateNote.isPending) return;
    if (text === note.text) return setDraft(null);
    updateNote.mutate({ noteId: note.id, text }, { onSuccess: () => setDraft(null) });
  };

  const remove = async () => {
    const ok = await confirm({ title: t("Delete this note?"), confirmText: t("Delete") });
    if (ok) deleteNote.mutate(note.id);
  };

  return (
    <div className="group border-border bg-card rounded-xl border p-3.5">
      <div className="flex items-center gap-2">
        <LeadAvatar
          name={note.author?.name ?? null}
          photo={note.author?.profilePhoto}
          tone="person"
          colorKey={note.authorId ?? note.id}
          size="sm"
        />
        <span className="text-foreground min-w-0 truncate text-[13px] font-semibold">
          {note.author?.name ?? t("Someone")}
        </span>
        <span
          className="text-muted-foreground shrink-0 text-[11.5px]"
          title={dayjs(note.createdAt).format("D MMM YYYY, h:mm A")}
        >
          {formatToRelativeTime(note.createdAt)}
          {edited ? ` · ${t("edited")}` : null}
        </span>
        <span className="flex-1" />
        {draft === null ? (
          // Hover-revealed on a pointer; always there on touch, which has no hover.
          <div className="flex shrink-0 items-center gap-0.5 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
            {isAuthor ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground size-7"
                onClick={() => setDraft(note.text)}
                aria-label={t("Edit note")}
              >
                <IconPencil className="size-3.5" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive size-7"
              onClick={() => void remove()}
              disabled={deleteNote.isPending}
              aria-label={t("Delete note")}
            >
              <IconTrash className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      {draft === null ? (
        <p className="text-foreground mt-2 text-[13.5px] leading-relaxed whitespace-pre-wrap">
          {note.text}
        </p>
      ) : (
        <div className="mt-2">
          <Textarea
            autoFocus
            value={draft}
            maxLength={4000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                // Cancels the edit rather than closing the whole modal.
                event.stopPropagation();
                setDraft(null);
                return;
              }
              submitOnEnter(save)(event);
            }}
            className="min-h-16 text-[13.5px]"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setDraft(null)}
            >
              {t("Cancel")}
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={save}
              disabled={!draft.trim()}
              loading={updateNote.isPending}
            >
              {t("Save")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The note composer and the lead's notes, newest first. */
export function LeadNotes({
  leadId,
  notes,
  currentUserId,
}: Readonly<{ leadId: string; notes: LeadNote[]; currentUserId: string | undefined }>) {
  const { t } = useTranslation();
  const createNote = useCreateLeadNoteMutation();
  const [draft, setDraft] = useState("");

  const saveNote = () => {
    const text = draft.trim();
    if (!text || createNote.isPending) return;
    createNote.mutate({ leadId, text }, { onSuccess: () => setDraft("") });
  };

  return (
    <>
      <div className="border-border focus-within:border-ring rounded-xl border p-3 transition-colors">
        <Textarea
          value={draft}
          maxLength={4000}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={submitOnEnter(saveNote)}
          placeholder={t("Add a note about this lead…")}
          className="min-h-12 resize-y border-none p-0 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-[11px]">
            {t("Enter to save · Shift+Enter for a new line")}
          </span>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={saveNote}
            disabled={!draft.trim()}
            loading={createNote.isPending}
          >
            {t("Save note")}
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {notes.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("No notes yet — anything the team types here stays with the lead.")}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {notes.map((note) => (
              <NoteItem key={note.id} note={note} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
