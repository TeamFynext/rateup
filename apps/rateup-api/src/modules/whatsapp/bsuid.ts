/**
 * WhatsApp business-scoped user IDs (BSUIDs).
 *
 * Since April 2026 every WhatsApp webhook names the customer by a BSUID as well as
 * (or, for a customer who has adopted a WhatsApp username, sometimes instead of)
 * their phone number. Meta's shape, per
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids:
 *
 * - `US.13491208655302741918` — two-letter country, a dot, up to 128 alphanumerics.
 * - `US.ENT.11815799212886844830` — a parent BSUID (enrolled portfolios only).
 * - Inbound: `messages[].from_user_id`, `contacts[].user_id`; `from` / `wa_id` may be omitted.
 * - Echoes: `message_echoes[].to_user_id`; `to` may be omitted.
 * - Statuses: `statuses[].recipient_user_id`; `recipient_id` may be omitted.
 * - Sending: put the BSUID in `recipient` and leave `to` out (`to` wins when both are set).
 *
 * Throughout this codebase a WhatsApp customer is still addressed by one string —
 * the phone number when we know it, the BSUID when we do not. A BSUID can never be
 * mistaken for a phone number (it has a dot and letters), so `isBsuid` is how code
 * tells the two apart. Pure: no I/O, safe to import anywhere.
 */

const BSUID_RE = /^[A-Z]{2}\.(?:ENT\.)?[A-Za-z0-9]{1,128}$/;
const PARENT_BSUID_RE = /^[A-Z]{2}\.ENT\.[A-Za-z0-9]{1,128}$/;

/** A BSUID or parent BSUID, as opposed to a phone number. */
export function isBsuid(value: unknown): value is string {
  return typeof value === "string" && BSUID_RE.test(value);
}

/** A parent BSUID, which Meta refuses for blocking and contact-book calls. */
export function isParentBsuid(value: unknown): value is string {
  return typeof value === "string" && PARENT_BSUID_RE.test(value);
}

const str = (value: unknown) => (typeof value === "string" && value ? value : undefined);

/** Who a WhatsApp customer is, as far as one webhook says. */
export interface WaCustomerIdentity {
  /** Digits, as Meta sends `wa_id` / `from`. Absent when Meta withheld it. */
  phone?: string;
  bsuid?: string;
  /** The customer's WhatsApp username, when they have adopted one. */
  username?: string;
}

type Loose = Record<string, unknown>;

/** The webhook's `contacts[]` entry for a customer, matched on BSUID or phone. */
function findContactEntry(contacts: unknown, phone?: string, bsuid?: string): Loose | undefined {
  if (!Array.isArray(contacts)) return undefined;
  const entries = contacts.filter((c): c is Loose => !!c && typeof c === "object");
  return (
    entries.find((c) => (bsuid && c.user_id === bsuid) || (phone && c.wa_id === phone)) ??
    (entries.length === 1 ? entries[0] : undefined)
  );
}

/**
 * The customer behind an inbound message: `from` / `from_user_id`, filled in from
 * the matching `contacts[]` entry (which also carries the username).
 */
export function inboundIdentity(
  message: { from?: unknown; from_user_id?: unknown } | undefined,
  contacts?: unknown,
): WaCustomerIdentity {
  let phone = str(message?.from);
  let bsuid = str(message?.from_user_id);
  // Defensive: a BSUID is never a phone number, whichever field it arrived in.
  if (isBsuid(phone)) [phone, bsuid] = [undefined, bsuid ?? phone];
  const entry = findContactEntry(contacts, phone, bsuid);
  phone ??= str(entry?.wa_id);
  bsuid ??= str(entry?.user_id);
  const username = str((entry?.profile as Loose | undefined)?.username);
  return { phone, bsuid: isBsuid(bsuid) ? bsuid : undefined, username };
}

/** The customer an echo (a reply sent from the WhatsApp Business app) went to. */
export function echoIdentity(
  echo: { to?: unknown; to_user_id?: unknown; recipient?: unknown } | undefined,
  contacts?: unknown,
): WaCustomerIdentity {
  let phone = str(echo?.to);
  let bsuid = str(echo?.to_user_id) ?? (isBsuid(echo?.recipient) ? echo.recipient : undefined);
  if (isBsuid(phone)) [phone, bsuid] = [undefined, bsuid ?? phone];
  const entry = findContactEntry(contacts, phone, bsuid);
  phone ??= str(entry?.wa_id);
  bsuid ??= str(entry?.user_id);
  const username = str((entry?.profile as Loose | undefined)?.username);
  return { phone, bsuid: isBsuid(bsuid) ? bsuid : undefined, username };
}

/**
 * The one string a customer is addressed by: phone when known, else the BSUID.
 * Undefined when the webhook named neither.
 */
export function waAddress(identity: WaCustomerIdentity): string | undefined {
  return identity.phone ?? identity.bsuid;
}

/**
 * A WhatsApp send body addressed the way Meta wants it. Every sender in the
 * codebase writes `to: <address>`; when that address is a BSUID it has to travel
 * as `recipient` instead, with `to` left out (Meta lets `to` win when both are
 * present, and would read a BSUID there as a malformed phone number).
 * Returns the same object when nothing changes.
 */
export function addressWaPayload<T extends Record<string, unknown>>(payload: T): T {
  if (!payload || !isBsuid(payload.to)) return payload;
  const { to, ...rest } = payload;
  return { ...rest, recipient: to } as unknown as T;
}

/** The address a send body was meant for: `to`, or `recipient` for a BSUID send. */
export function payloadAddress(payload: unknown): string | undefined {
  const body = payload as { to?: unknown; recipient?: unknown } | undefined;
  return str(body?.to) ?? (isBsuid(body?.recipient) ? body.recipient : undefined);
}
