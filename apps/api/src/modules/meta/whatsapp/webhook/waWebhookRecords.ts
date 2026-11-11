/**
 * How a WhatsApp Business webhook delivery is cut into `wa-webhooks` records.
 *
 * Pure (no I/O, no imports with side effects) so the API's ingress route and the
 * `kafka` service's consumer can both use it, and so it can be tested alone.
 *
 * The record key is what Kafka partitions on, so it decides what is processed in
 * order: everything with the same key lands on one partition and is consumed one
 * record at a time. The key is the conversation — the customer — so a customer's
 * burst of messages reaches the automations in the order they sent it, while
 * different customers are processed side by side. A customer is keyed by their
 * business-scoped user ID (BSUID) when the webhook carries one, else by phone:
 * the BSUID is on every webhook, while Meta withholds the phone number of a
 * customer with a WhatsApp username, so keying on the phone would put the same
 * customer on two partitions depending on whether a given webhook shared it.
 *
 * A delivery can carry several conversations: Meta batches entries, changes, and
 * the messages and statuses inside a change. One key cannot order all of them,
 * so the delivery is split — one record per (entry, change, conversation) — and
 * each record is a complete webhook body of its own, in the shape Meta sends,
 * carrying only that slice. The consumer cannot tell a split record from an
 * unsplit one. A delivery that needs no split (the common case: one entry, one
 * change, one customer) goes through as the raw bytes Meta signed.
 *
 * Keys by change:
 * - `messages` with inbound messages: the sender (`messages[].from_user_id`, else
 *   `from`), one record per sender, `contacts` narrowed to that sender.
 * - `messages` with statuses only: the business number (`phone_number_id`). A
 *   message's own receipts are ordered again downstream, on `status-events` by
 *   message id, so they need no finer key here — and a batch of receipts for a
 *   hundred recipients stays one record instead of a hundred.
 * - `smb_message_echoes`: the customer the business wrote to (`to_user_id`, else `to`).
 * - `messaging_handovers`: the customer (`sender.user_id`, else `sender.phone_number`).
 * - `standby`: the customer of the thread the agent holds (first message's
 *   sender, else the first contact or echo recipient). Not split further: the
 *   standby handler walks every item itself, and Meta sends one thread per change.
 * - anything else (templates, account updates, calls, …): the business number,
 *   else the entry id (the WABA).
 */
import type { WaMessageBody } from "../../../../types/whatsapp.types.js";

// One spelling of the topic names, shared with the provisioning in utils/kafka.ts.
export {
  WA_WEBHOOKS_TOPIC as WA_WEBHOOK_TOPIC,
  WA_WEBHOOKS_DLQ_TOPIC as WA_WEBHOOK_DLQ_TOPIC,
} from "../../../../utils/kafka.js";

export interface WaWebhookRecord {
  key: string;
  value: string;
}

type Loose = Record<string, unknown>;
type Entry = { id?: string; changes?: Change[] } & Loose;
type Change = { field?: string; value?: Loose } & Loose;

const list = (value: unknown): Loose[] =>
  Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
const str = (value: unknown) => (typeof value === "string" && value ? value : undefined);

/** The customer an inbound message is from: BSUID first, phone second. */
const senderKey = (message: Loose | undefined) => str(message?.from_user_id) ?? str(message?.from);
/** The customer an echo went to: BSUID first, phone second. */
const echoKey = (echo: Loose | undefined) => str(echo?.to_user_id) ?? str(echo?.to);
/** A `contacts[]` entry's key, spelt the same way. */
const contactKey = (contact: Loose | undefined) => str(contact?.user_id) ?? str(contact?.wa_id);

/** A change's slices: the value to send and the key to send it under. */
function sliceChange(change: Change, fallbackKey: string): { key: string; value: Loose }[] {
  const value = (change.value ?? {}) as Loose;
  const metadata = (value.metadata ?? {}) as Loose;
  const phoneKey = str(metadata.phone_number_id) ?? fallbackKey;

  if (change.field === "standby") {
    const standby = (value.standby ?? {}) as Loose;
    const echo = list(standby.message_echoes)[0]?.message as Loose | undefined;
    const key =
      senderKey(list(standby.messages)[0]) ??
      contactKey(list(standby.contacts)[0]) ??
      echoKey(echo) ??
      str(echo?.recipient) ??
      phoneKey;
    return [{ key, value }];
  }

  if (change.field === "messaging_handovers") {
    const sender = (value.sender ?? {}) as Loose;
    return [{ key: str(sender.user_id) ?? str(sender.phone_number) ?? phoneKey, value }];
  }

  const messages = list(value.messages);
  const echoes = list(value.message_echoes);
  const statuses = list(value.statuses);
  if (change.field === "calls" || (!messages.length && !echoes.length)) {
    return [{ key: phoneKey, value }];
  }

  // Inbound messages and echoes, grouped by conversation; first-seen order kept,
  // and within a conversation Meta's order is kept.
  const { messages: _m, message_echoes: _e, statuses: _s, contacts, ...rest } = value;
  const groups = new Map<string, { messages: Loose[]; echoes: Loose[] }>();
  const group = (key: string) => {
    let found = groups.get(key);
    if (!found) groups.set(key, (found = { messages: [], echoes: [] }));
    return found;
  };
  for (const message of messages) group(senderKey(message) ?? phoneKey).messages.push(message);
  for (const echo of echoes) group(echoKey(echo) ?? phoneKey).echoes.push(echo);

  // Nothing to cut: send the change as it came.
  if (groups.size === 1 && !statuses.length) {
    return [{ key: groups.keys().next().value as string, value }];
  }

  const allContacts = list(contacts);
  const slices = [...groups].map(([key, { messages: mine, echoes: myEchoes }]) => {
    // Matched on either spelling: a key is a BSUID, but a contact entry from
    // before BSUIDs (or a test fixture) may only carry `wa_id`.
    const phones = new Set(
      [...mine.map((m) => str(m.from)), ...myEchoes.map((e) => str(e.to))].filter(Boolean),
    );
    const own = allContacts.filter(
      (contact) =>
        contactKey(contact) === key || (!!contact.wa_id && phones.has(contact.wa_id as string)),
    );
    const slice: Loose = { ...rest };
    if (contacts !== undefined) slice.contacts = own.length ? own : contacts;
    if (mine.length) slice.messages = mine;
    if (myEchoes.length) slice.message_echoes = myEchoes;
    return { key, value: slice };
  });
  if (statuses.length) {
    slices.push({ key: phoneKey, value: { ...rest, statuses } });
  }
  return slices;
}

/**
 * The records to publish for one delivery. `rawBody` is reused verbatim when the
 * delivery needs no split. Empty when the delivery has no change in it at all —
 * there is nothing to process, and the caller still answers Meta 200.
 */
export function buildWaWebhookRecords(body: WaMessageBody, rawBody?: string): WaWebhookRecord[] {
  const delivery = (body ?? {}) as unknown as { object?: string; entry?: Entry[] } & Loose;
  const entries = Array.isArray(delivery.entry) ? delivery.entry : [];

  const pieces: { key: string; entry: Entry; change: Change; whole: boolean }[] = [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const slices = sliceChange(change, str(entry.id) ?? "unknown");
      for (const slice of slices) {
        pieces.push({
          key: slice.key,
          entry,
          change: slice.value === change.value ? change : { ...change, value: slice.value },
          whole: slice.value === change.value,
        });
      }
    }
  }

  const single =
    pieces.length === 1 &&
    entries.length === 1 &&
    entries[0]?.changes?.length === 1 &&
    pieces[0]!.whole;
  return pieces.map(({ key, entry, change }) => ({
    key,
    value:
      single && rawBody !== undefined
        ? rawBody
        : JSON.stringify({ ...delivery, entry: [{ ...entry, changes: [change] }] }),
  }));
}
