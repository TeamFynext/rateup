import { isOptimisticId } from "@/store/inboxStore";

/** The fields of a cached message this decision reads. */
type ThreadMessage = {
  id?: string;
  messageId?: string | null;
  conversationId?: string | null;
  sourcePlatform?: string | null;
};

/**
 * Whether a cached message belongs in the thread of one ticket. Mirrors the API's thread
 * query (`getWaMessagesByContactId` + `legacyHistoryFor`) so a thread painted from the cache
 * matches the one the server would send:
 *
 * - the ticket's own messages;
 * - a send still in flight, whose placeholder has no ticket yet;
 * - history from before tickets existed (no `conversationId`), but only on a ticket of the
 *   same platform. That history is WhatsApp-era, so a WhatsApp ticket also takes rows with no
 *   platform and old internal events; a webchat or Instagram ticket takes only its own.
 *
 * `ticketPlatform` unknown (null) keeps all of that history, as before.
 */
export function belongsToTicket(
  message: ThreadMessage | null | undefined,
  conversationId: string,
  ticketPlatform: string | null,
): boolean {
  if (!message) return false;
  if (message.conversationId === conversationId) return true;
  if (message.conversationId != null) return false;
  if (isOptimisticId(message.messageId ?? message.id)) return true;
  if (!ticketPlatform) return true;
  if (ticketPlatform === "WHATSAPP") {
    return (
      message.sourcePlatform == null ||
      message.sourcePlatform === "WHATSAPP" ||
      message.sourcePlatform === "INTERNAL"
    );
  }
  return message.sourcePlatform === ticketPlatform;
}
