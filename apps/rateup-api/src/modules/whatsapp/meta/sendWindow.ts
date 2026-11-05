/**
 * Instagram and Messenger messaging windows, and the gate every Send API message passes.
 *
 * Meta lets a business reply freely for 24 h after the customer's last message. With the
 * Human Agent tag a person (never an automation) may reply for 7 days. A thread opened from
 * a click-to-Direct ad stays open until `Conversation.adThreadUntil`. Past all three, Meta
 * refuses the message, so it is refused here before the call — with words an agent can act on.
 *
 * Both send paths use this: `sendMetaMessage` and the inbox's older `sendMessage`.
 */

import { PlatformType } from "../../../../generated/prisma/enums.js";
import { HttpError } from "../../../utils/http.js";
import prisma from "../../../utils/prisma.js";

const HOUR_MS = 60 * 60 * 1000;
export const RESPONSE_WINDOW_MS = 24 * HOUR_MS;
export const HUMAN_AGENT_WINDOW_MS = 7 * 24 * HOUR_MS;

export type MessagingWindowState = "open" | "human_agent" | "closed";

export interface MessagingWindow {
  state: MessagingWindowState;
  /** End of the free-reply window (24 h, or the ad window if later). Null = never opened. */
  openUntil: Date | null;
  /** When a human can no longer reply at all. Null = never opened. */
  closesAt: Date | null;
}

/** What goes on the Send API body for a human reply, or nothing for a closed window. */
export type SendWindowFields =
  | { messaging_type: "RESPONSE" }
  | { messaging_type: "MESSAGE_TAG"; tag: "HUMAN_AGENT" };

export const WINDOW_CLOSED_MESSAGE =
  "More than 7 days have passed since this customer's last message, so Meta no longer allows a reply. They need to message you first.";

export const IG_BLOCKED_MESSAGE =
  "You blocked this person on Instagram. Unblock them to send a message.";

/**
 * The window for a thread, from the customer's last inbound message and any ad window.
 * Pure: `now` is passed so the boundaries can be tested.
 */
export function messagingWindow({
  lastInboundAt,
  adThreadUntil,
  now = new Date(),
}: {
  lastInboundAt: Date | null | undefined;
  adThreadUntil?: Date | null;
  now?: Date;
}): MessagingWindow {
  const responseUntil = lastInboundAt ? lastInboundAt.getTime() + RESPONSE_WINDOW_MS : null;
  const humanUntil = lastInboundAt ? lastInboundAt.getTime() + HUMAN_AGENT_WINDOW_MS : null;
  const adUntil = adThreadUntil?.getTime() ?? null;

  const openUntilMs = maxOf(responseUntil, adUntil);
  const closesAtMs = maxOf(humanUntil, adUntil);
  const at = now.getTime();

  const state: MessagingWindowState =
    openUntilMs !== null && at < openUntilMs
      ? "open"
      : closesAtMs !== null && at < closesAtMs
        ? "human_agent"
        : "closed";

  return {
    state,
    openUntil: openUntilMs === null ? null : new Date(openUntilMs),
    closesAt: closesAtMs === null ? null : new Date(closesAtMs),
  };
}

function maxOf(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

/** The Send API fields for a human reply in this window; null when it is closed. */
export function sendWindowFields(window: MessagingWindow): SendWindowFields | null {
  if (window.state === "open") return { messaging_type: "RESPONSE" };
  if (window.state === "human_agent") return { messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" };
  return null;
}

/**
 * Only a person replying from the inbox may use the Human Agent tag. Meta's policy forbids
 * it on automated messages, and an app caught tagging them loses the permission.
 */
export function isHumanInboxSend(input: {
  platform: PlatformType;
  messageType?: string;
  userId?: string;
  isAutomated?: boolean;
}): boolean {
  return (
    (input.platform === PlatformType.INSTAGRAM || input.platform === PlatformType.FACEBOOK) &&
    (input.messageType ?? "INBOX") === "INBOX" &&
    Boolean(input.userId) &&
    !input.isAutomated
  );
}

/** Refused before Meta is called; 422 so the composer shows the message. */
export class MetaSendRefusedError extends HttpError {
  readonly reason: "window_closed" | "ig_blocked";
  constructor(reason: "window_closed" | "ig_blocked") {
    super(reason === "window_closed" ? WINDOW_CLOSED_MESSAGE : IG_BLOCKED_MESSAGE, 422);
    this.name = "MetaSendRefusedError";
    this.reason = reason;
  }
}

/** A message, as opposed to a sender action (typing, seen, react), which takes no tag. */
function carriesMessage(payload: Record<string, unknown>): boolean {
  return payload.message !== undefined && payload.message !== null;
}

/**
 * The thread's window, read from the customer's newest inbound message on this platform —
 * per platform because a contact can write on Instagram and Messenger both. Falls back to
 * the contact's last-received time for history that predates the platform column.
 */
export async function loadMessagingWindow(
  contact: { id: string; lastReceivedMessageTimeStamp: Date | null },
  platform: PlatformType,
  now = new Date(),
): Promise<MessagingWindow> {
  const [latest, adThread] = await Promise.all([
    prisma.waMessage.findFirst({
      where: {
        contactId: contact.id,
        sourcePlatform: platform,
        messageBody: { path: ["exchangeProcess"], equals: "receive" },
      },
      orderBy: { waCreatedAt: "desc" },
      select: { waCreatedAt: true, createdAt: true },
    }),
    prisma.conversation.findFirst({
      where: { contactId: contact.id, adThreadUntil: { gt: now } },
      orderBy: { adThreadUntil: "desc" },
      select: { adThreadUntil: true },
    }),
  ]);
  const lastInboundAt = latest
    ? (latest.waCreatedAt ?? latest.createdAt)
    : contact.lastReceivedMessageTimeStamp;
  return messagingWindow({ lastInboundAt, adThreadUntil: adThread?.adThreadUntil, now });
}

/**
 * The gate for a human Send API reply. Throws {@link MetaSendRefusedError} when the person
 * is blocked on Instagram, or the reply falls outside every window. Returns the payload to
 * send: for a human reply, with `messaging_type` (and `tag`) set; otherwise unchanged.
 *
 * WhatsApp and webchat payloads pass straight through, without a query.
 */
export async function gateSendApiMessage<P extends Record<string, unknown>>(input: {
  orgId: string;
  platform: PlatformType;
  /** igsId or psid. A private reply has none and is addressed to a comment. */
  to: string | undefined;
  payload: P;
  messageType?: string;
  userId?: string;
  isAutomated?: boolean;
}): Promise<P | (P & SendWindowFields)> {
  const { orgId, platform, to, payload } = input;
  if (!to || (platform !== PlatformType.INSTAGRAM && platform !== PlatformType.FACEBOOK)) {
    return payload;
  }
  // Automations are left to Meta, which refuses a blocked person itself: a read on every
  // flowbot step is not worth an earlier error nobody is watching for.
  if (!isHumanInboxSend(input) || !carriesMessage(payload)) return payload;

  const contact = await prisma.contact.findFirst({
    where: platform === PlatformType.INSTAGRAM ? { orgId, igsId: to } : { orgId, psid: to },
    select: { id: true, igBlockedAt: true, lastReceivedMessageTimeStamp: true },
  });
  if (!contact) return payload;
  if (platform === PlatformType.INSTAGRAM && contact.igBlockedAt) {
    throw new MetaSendRefusedError("ig_blocked");
  }

  const fields = sendWindowFields(await loadMessagingWindow(contact, platform));
  if (!fields) throw new MetaSendRefusedError("window_closed");
  return { ...payload, ...fields };
}

/**
 * Meta's own "outside the allowed window" errors: Messenger's 10/2018278 and Instagram's
 * 10/2534022. Both mean the same to an agent.
 */
export function isOutsideWindowError(
  detail: { code?: unknown; error_subcode?: unknown } | undefined,
): boolean {
  return (
    detail?.code === 10 && (detail.error_subcode === 2018278 || detail.error_subcode === 2534022)
  );
}

export const OUTSIDE_WINDOW_MESSAGE =
  "This message was sent outside the time Meta allows for replies. Customers can be answered for 24 hours after their last message, or up to 7 days by a person.";

/** Meta refused the Human Agent tag (613/2018338): usually the app lacks the permission. */
export function isHumanAgentTagRefused(
  detail: { code?: unknown; error_subcode?: unknown } | undefined,
): boolean {
  return detail?.code === 613 && detail.error_subcode === 2018338;
}

export const HUMAN_AGENT_REFUSED_MESSAGE =
  "Meta refused this reply: more than 24 hours have passed and the Human Agent permission is not active for this app.";
