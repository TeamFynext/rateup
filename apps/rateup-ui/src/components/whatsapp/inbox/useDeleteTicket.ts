import { useDeleteConversation } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { UserRole } from "@/utils/enums/index.ts";

/** The bits of an inbox row this action needs — any ticket row satisfies it. */
export interface DeletableTicket {
  id: string;
  conversationId?: string | null;
  ticketNumber?: number | null;
  name?: string | null;
  phone?: string | null;
}

/**
 * "Delete conversation" — shared by the thread header and the list row so both
 * ask the same question and hit the same endpoint.
 *
 * Admin-only, mirroring the server's own gate: the delete takes the ticket's
 * messages with it and there is nothing to undo it with, so it is not an action
 * every agent working the inbox gets. `canDelete` is false for a row with no
 * conversation of its own (a legacy, un-backfilled thread) — there is no ticket
 * to address.
 */
export function useDeleteTicket(contact: DeletableTicket | null | undefined) {
  const { user } = useUser();
  const confirm = useConfirm();
  const mutation = useDeleteConversation();

  const conversationId = contact?.conversationId ?? null;
  const isAdmin = user?.role === UserRole.SUPADM || user?.role === UserRole.ADM;
  const canDelete = Boolean(contact && conversationId && isAdmin);

  async function deleteTicket() {
    if (!contact || !conversationId) return;

    const who = contact.name ?? contact.phone ?? "this contact";
    const ticket = contact.ticketNumber ? `Ticket #${contact.ticketNumber}` : "This conversation";
    const confirmed = await confirm({
      title: "Delete conversation",
      description: `${ticket} with ${who} will be deleted.`,
      warning:
        "The ticket and every message in it are permanently deleted for everyone. This cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    mutation.mutate({ conversationId, contactId: contact.id });
  }

  return { canDelete, deleteTicket, isPending: mutation.isPending };
}
