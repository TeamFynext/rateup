import { MessagePlatform } from "@/types/enums.ts";

/**
 * Instagram and Messenger reply windows — a mirror of rateup-api's `meta/sendWindow.ts`.
 *
 * Free replies for 24 h after the customer's last message (or until an ad thread's window
 * ends, if later); a person may then reply for up to 7 days with the Human Agent tag; after
 * that Meta refuses anything until the customer writes again.
 *
 * Computed here rather than read from the row's `messagingWindow`: the row is cached, but
 * `lastReceivedMessageTimeStamp` is kept live by the socket, so this is the fresher answer.
 */

const HOUR_MS = 60 * 60 * 1000;
export const RESPONSE_WINDOW_MS = 24 * HOUR_MS;
export const HUMAN_AGENT_WINDOW_MS = 7 * 24 * HOUR_MS;

export type MessagingWindowState = "open" | "human_agent" | "closed";

export interface MessagingWindow {
  state: MessagingWindowState;
  /** End of the free-reply window. Null when the customer never wrote. */
  openUntil: Date | null;
  /** When a person can no longer reply at all. Null when the customer never wrote. */
  closesAt: Date | null;
}

type DateInput = string | Date | null | undefined;

function toMs(value: DateInput): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function maxOf(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

export function messagingWindow({
  lastInboundAt,
  adThreadUntil,
  now = new Date(),
}: {
  lastInboundAt: DateInput;
  adThreadUntil?: DateInput;
  now?: Date;
}): MessagingWindow {
  const inbound = toMs(lastInboundAt);
  const ad = toMs(adThreadUntil);
  const openUntil = maxOf(inbound === null ? null : inbound + RESPONSE_WINDOW_MS, ad);
  const closesAt = maxOf(inbound === null ? null : inbound + HUMAN_AGENT_WINDOW_MS, ad);
  const at = now.getTime();
  const state: MessagingWindowState =
    openUntil !== null && at < openUntil
      ? "open"
      : closesAt !== null && at < closesAt
        ? "human_agent"
        : "closed";
  return {
    state,
    openUntil: openUntil === null ? null : new Date(openUntil),
    closesAt: closesAt === null ? null : new Date(closesAt),
  };
}

/** Instagram and Messenger: the channels with a Human Agent window. */
export function hasHumanAgentWindow(platform: MessagePlatform | string | null | undefined) {
  return platform === MessagePlatform.INSTAGRAM || platform === MessagePlatform.FACEBOOK;
}

/** The thread's window, or null on a channel without one (WhatsApp keeps its 24 h session). */
export function contactMessagingWindow(
  contact: {
    lastReceivedMessageTimeStamp?: string | null;
    adThreadUntil?: string | null;
  },
  platform: MessagePlatform | string | null | undefined,
  now = new Date(),
): MessagingWindow | null {
  if (!hasHumanAgentWindow(platform)) return null;
  return messagingWindow({
    lastInboundAt: contact.lastReceivedMessageTimeStamp,
    adThreadUntil: contact.adThreadUntil,
    now,
  });
}

/** Whole days and hours left until `until`, for "closes in 3 days" copy. */
export function timeLeft(until: Date, now = new Date()): { days: number; hours: number } {
  const ms = Math.max(0, until.getTime() - now.getTime());
  return {
    days: Math.floor(ms / (24 * HOUR_MS)),
    hours: Math.floor((ms % (24 * HOUR_MS)) / HOUR_MS),
  };
}
