import { IconArrowRight, IconChevronDown, IconChevronUp, IconHistory } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import type { ContactConversation } from "@/backend/whatsapp/inbox/message/wamessage.api.ts";
import { useConversationsByContact } from "@/backend/whatsapp/inbox/message/wamessage.query.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import { useContactsStore } from "@/store/inbox.store.ts";
import { getContactPlatform } from "@/utils/whatsapp/inbox.ts";

import { getSoucePlatformIconAndColor } from "../../util.tsx";
import { deriveStatus, resolutionResultLabel, STATUS_PILL_BASE } from "./ticket.ts";

interface ConversationHistoryStripProps {
  contact: ContactWithUpdatedAt;
}

function formatCreated(value?: string | null): string {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("MMM D, YYYY") : "";
}

/**
 * Amber "N previous conversations" bar shown when the selected contact owns
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

  const { data: conversations } = useConversationsByContact(contact?.id, !!contact?.id);

  /** Every ticket of this contact except the one currently open. */
  const siblings = useMemo(
    () => (conversations ?? []).filter((c) => c.id !== contact?.conversationId),
    [conversations, contact?.conversationId],
  );

  const platform = getContactPlatform(contact);
  const channel = getSoucePlatformIconAndColor(platform);

  /**
   * Siblings are not inbox rows, so we never hand one straight to the store.
   * Prefer a real cached row; otherwise merge the sibling's ticket fields onto
   * the current selection — safe because every sibling is the SAME contact, so
   * all contact-level fields already hold.
   */
  function openSibling(sibling: ContactConversation) {
    const cached = contactsById.get(sibling.id);
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
          {siblings.length} previous conversation{siblings.length === 1 ? "" : "s"}
        </span>
        {lastDate && (
          <span className="truncate text-xs text-muted-foreground">· last on {lastDate}</span>
        )}
        <span className="flex-1" />
        <Chevron className="size-4 shrink-0 text-amber-700 dark:text-amber-500" />
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 px-5 pt-0.5 pb-3">
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
              <button
                type="button"
                key={sibling.id}
                onClick={() => openSibling(sibling)}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-left hover:border-primary"
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-md *:size-3 ${channel?.bgColor ?? ""}`}
                >
                  {channel?.icon}
                </span>
                {sibling.number ? (
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    #{sibling.number}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                  {sibling.subject || ""}
                </span>
                <span className={`${STATUS_PILL_BASE} shrink-0 ${status.className}`}>
                  <span className="size-[5px] rounded-full bg-current" />
                  {status.label}
                </span>
                {assignees && (
                  <span className="max-w-[9rem] shrink-0 truncate text-[11px] text-muted-foreground">
                    {assignees}
                  </span>
                )}
                {resultLabel && (
                  <span className="shrink-0 rounded-full bg-green-600/10 px-2 py-0.5 text-[10px] font-bold text-green-600">
                    {resultLabel}
                  </span>
                )}
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatCreated(sibling.createdAt)}
                </span>
                <IconArrowRight className="size-3 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
