/**
 * The key an inbox row is stored under: its ticket (`conversationId`), or the
 * contact id for a row that names no ticket (the spam tab, rows cached before
 * tickets).
 *
 * The list endpoint is ticket-grained, so one contact can have several rows: a
 * customer who wrote on WhatsApp and on Instagram is one contact with a ticket
 * per channel. Keying the store by contact kept only the newest of those rows,
 * which hid a contact's Instagram, Messenger and webchat tickets behind its
 * WhatsApp one. Mirrors `getRowKey` in rateup-ui.
 */
export function getRowKey(row: { id: string; conversationId?: string | null } | null | undefined) {
  return (row?.conversationId ?? row?.id) as string;
}
