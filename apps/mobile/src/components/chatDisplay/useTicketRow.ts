import { useMemo } from "react";
import { selectRowForContact, useContactsStore } from "@/store/inboxStore";
import { useSelectedContactStore } from "@/utils/store";
import type { ContactsWithLastMessage } from "@/api/inbox/types";

/**
 * The ticket the chat shows, as one row: the open chat's selection merged with its inbox
 * row (which the socket and the list keep fresh). The selection is only trusted when it
 * describes this contact; a notification deep link can leave the previous one there.
 *
 * When the two disagree on the ticket (right after a reopen or a switch to another of
 * the contact's tickets, before the list has that row) the selection wins.
 */
export function useTicketRow(contactId: string): ContactsWithLastMessage | undefined {
  const selected = useSelectedContactStore((s) => s.selectedContact);
  const contact = selected?.id === contactId ? selected : undefined;
  const stored = useContactsStore((s) =>
    selectRowForContact(s, contactId, contact?.conversationId),
  );
  return useMemo(() => {
    if (stored && contact && stored.conversationId === contact.conversationId) {
      return { ...contact, ...stored };
    }
    return contact ?? stored;
  }, [stored, contact]);
}
