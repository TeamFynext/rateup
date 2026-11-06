import { IconDotsVertical, IconPin, IconPinnedFilled, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { orgNotesQueryOptions, useEditOrgNote, type OrgNote } from "@/api/org-actions.api";
import { SectionHeading } from "@/components/ds/page-heading";
import { Panel } from "@/components/ds/panel";
import { ErrorState, ListSkeleton } from "@/components/ds/query-states";
import type { OrgAction } from "@/components/org/actions/org-action-dialogs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime, formatRelative } from "@/lib/format";

/**
 * What staff know about this account that the data does not say. Pinned notes come first —
 * the same list, ordered by the API, so a pin is one click rather than a second place to
 * keep things.
 */
export function OrgNotesPanel({
  orgId,
  onAction,
  className,
}: {
  orgId: string;
  onAction: (action: OrgAction) => void;
  className?: string;
}) {
  const query = useQuery(orgNotesQueryOptions(orgId));
  const pin = useEditOrgNote(orgId);

  return (
    <Panel className={className}>
      <div className="flex flex-col gap-6">
        <SectionHeading
          action={
            <Button
              variant="outline"
              className="h-9 rounded-xl px-3"
              onClick={() => onAction({ kind: "note" })}
            >
              <IconPlus />
              Add
            </Button>
          }
        >
          Staff notes
        </SectionHeading>

        {query.isPending ? (
          <ListSkeleton rows={2} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing noted yet. Notes are for staff only — the customer never sees them.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {query.data.map((note) => (
              <li key={note.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm whitespace-pre-wrap wrap-break-word">{note.body}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {note.pinned && (
                      <IconPinnedFilled className="size-3.5 text-tone-peach-accent" />
                    )}
                    <span className="truncate">{note.staffEmail}</span>
                    <span title={formatDateTime(note.createdAt)}>
                      {formatRelative(note.createdAt)}
                    </span>
                    {note.updatedAt !== note.createdAt && <span>· edited</span>}
                  </p>
                </div>
                <NoteMenu
                  note={note}
                  onAction={onAction}
                  onTogglePin={() => pin.mutate({ noteId: note.id, pinned: !note.pinned })}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function NoteMenu({
  note,
  onAction,
  onTogglePin,
}: {
  note: OrgNote;
  onAction: (action: OrgAction) => void;
  onTogglePin: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Note actions"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <IconDotsVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40 p-1.5">
        <DropdownMenuItem onClick={onTogglePin}>
          <IconPin />
          {note.pinned ? "Unpin" : "Pin to top"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction({ kind: "note", note })}>Edit</DropdownMenuItem>
        <DropdownMenuItem
          className="text-negative data-highlighted:text-negative"
          onClick={() => onAction({ kind: "delete-note", note })}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
