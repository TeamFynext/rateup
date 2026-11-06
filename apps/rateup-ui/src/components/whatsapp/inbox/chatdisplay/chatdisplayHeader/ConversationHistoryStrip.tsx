import { IconChevronDown, IconChevronUp, IconHistory } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

import type { ContactConversation } from "@/backend/whatsapp/inbox/message/wamessage.api.ts";
import { useConversationsByContact } from "@/backend/whatsapp/inbox/message/wamessage.query.ts";
import { cn } from "@/lib/utils";
import { useConversationHistoryRequest } from "@/store/conversation-history.store.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { useContactsStore } from "@/store/inbox.store.ts";

import { deriveStatus, resolutionResultLabel, STATUS_PILL_BASE } from "./ticket.ts";

interface ConversationHistoryStripProps {
  contact: ContactWithUpdatedAt;
}

function formatCreated(value?: string | null): string {
  if (!value) return "";
  const d = dayjs(value);
  if (!d.isValid()) return "";
  return d.format(d.isSame(dayjs(), "year") ? "MMM D" : "MMM D, YYYY");
}

/**
 * Amber "N other conversations" bar shown when the selected contact owns
 * sibling tickets.
 *
 * The list comes from the by-contact endpoint rather than the inbox store, so it
 * is complete regardless of which rows the list panel has paged in. It renders
 * nothing at all when the contact has no siblings.
 */
export default function ConversationHistoryStrip({
  contact,
}: Readonly<ConversationHistoryStripProps>) {
  const [open, setOpen] = useState(false);
  const contactsById = useContactsStore((s) => s.contactsById);
  const setSelectedContact = useContactsStore((s) => s.setSelectedContact);
  const requestedContactId = useConversationHistoryRequest((s) => s.contactId);
  const clearRequest = useConversationHistoryRequest((s) => s.requestFor);

  useEffect(() => {
    if (!requestedContactId || requestedContactId !== contact?.id) return;
    setOpen(true);
    clearRequest(null);
  }, [requestedContactId, contact?.id, clearRequest]);

  const { data: conversations } = useConversationsByContact(contact?.id, !!contact?.id);

  /** Every ticket of this contact except the one currently open. */
  const siblings = useMemo(
    () => (conversations ?? []).filter((c) => c.id !== contact?.conversationId),
    [conversations, contact?.conversationId],
  );

  /**
   * Siblings are not inbox rows, so we never hand one straight to the store.
   * Prefer a real cached row; otherwise merge the sibling's ticket fields onto
   * the current selection — safe because every sibling is the SAME contact, so
   * all contact-level fields already hold.
   */
  function openSibling(sibling: ContactConversation) {
    const cached = contactsById.get(sibling.id);
    // The list has done its job once a ticket is picked; left open it pushes
    // the thread just opened below the fold.
    setOpen(false);
    if (cached) {
      setSelectedContact(cached);
    } else {
      setSelectedContact({
        ...contact,
        conversationId: sibling.id,
        ticketNumber: sibling.number,
        ticketSubject: sibling.subject,
        ticketDescription: sibling.description,
        resolutionResult: sibling.resolutionResult,
        conversationStatus: sibling.status,
        ticketCreatedAt: sibling.createdAt,
        unReadMessageCount: 0,
      });
    }
  }

  if (siblings.length === 0) return null;

  const lastDate = formatCreated(siblings[0]?.createdAt);
  const stillOpen = siblings.filter((sibling) => {
    const id = deriveStatus({
      conversationStatus: sibling.status,
      assignedUsers: sibling.assignedUsers,
    }).id;
    return id === "new" || id === "assigned";
  }).length;
  const Chevron = open ? IconChevronUp : IconChevronDown;

  return (
    <div className="shrink-0 border-b border-border bg-amber-50 dark:bg-amber-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-5 py-2 text-left"
      >
        <IconHistory className="size-3.5 shrink-0 text-amber-700 dark:text-amber-500" />
        <span className="shrink-0 text-xs font-bold text-amber-700 dark:text-amber-500">
          {siblings.length} other conversation{siblings.length === 1 ? "" : "s"}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {stillOpen > 0 && `· ${stillOpen} still open `}
          {lastDate && `· latest ${lastDate}`}
        </span>
        <span className="flex-1" />
        <Chevron className="size-4 shrink-0 text-amber-700 dark:text-amber-500" />
      </button>

      {open && (
        <div className="px-5 pb-2.5">
          {/* About six rows tall; a long history scrolls here rather than
              pushing the thread off screen. */}
          <ul className="max-h-46 divide-y divide-border overflow-y-auto overscroll-contain rounded-lg border border-border bg-background">
            {siblings.map((sibling) => {
              const resultLabel = resolutionResultLabel(sibling.resolutionResult);
              // Same derivation as the thread header and the list rows, so a ticket
              // reads the same wherever it appears. The endpoint only returns
              // assignees that are still on the ticket, which is exactly what
              // decides Assigned vs New.
              const status = deriveStatus({
                conversationStatus: sibling.status,
                assignedUsers: sibling.assignedUsers,
              });
              const assignees = (sibling.assignedUsers ?? [])
                .map((a) => a.user?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <li key={sibling.id}>
                  <button
                    type="button"
                    onClick={() => openSibling(sibling)}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <span className="w-7 shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                      {sibling.number ? `#${sibling.number}` : ""}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        sibling.subject ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {sibling.subject || assignees}
                    </span>
                    {resultLabel && (
                      <span className="shrink-0 text-[10px] font-semibold text-green-600">
                        {resultLabel}
                      </span>
                    )}
                    <span className={cn(STATUS_PILL_BASE, "shrink-0", status.className)}>
                      <span className="size-[5px] rounded-full bg-current" />
                      {status.label}
                    </span>
                    <span className="w-12 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
                      {formatCreated(sibling.createdAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
