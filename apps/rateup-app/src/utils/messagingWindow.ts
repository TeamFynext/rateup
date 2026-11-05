import { MessagePlatform } from "@/constants/enums";

/**
 * Instagram and Messenger reply windows — the same rule as rateup-api's
 * `meta/sendWindow.ts`: free replies for 24 h after the customer's last message (or until
 * an ad thread's window ends, if later), then up to 7 days for a person (Meta's Human
 * Agent tag), then nothing until the customer writes again. WhatsApp keeps its 24 h
 * session and is not covered here.
 */

const HOUR_MS = 60 * 60 * 1000;
const RESPONSE_WINDOW_MS = 24 * HOUR_MS;
const HUMAN_AGENT_WINDOW_MS = 7 * 24 * HOUR_MS;

export type MessagingWindowState = "open" | "human_agent" | "closed";

export interface MessagingWindow {
  state: MessagingWindowState;
  /** End of the free-reply window. Null when the customer never wrote. */
  openUntil: Date | null;
  /** When a person can no longer reply. Null when the customer never wrote. */
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

/** The thread's window on Instagram or Messenger; null on any other channel. */
export function contactMessagingWindow(
  contact: { lastReceivedMessageTimeStamp?: string | null; adThreadUntil?: string | null },
  platform: string | null | undefined,
  now = new Date(),
): MessagingWindow | null {
  if (platform !== MessagePlatform.INSTAGRAM && platform !== MessagePlatform.FACEBOOK) {
    return null;
  }
  return messagingWindow({
    lastInboundAt: contact.lastReceivedMessageTimeStamp,
    adThreadUntil: contact.adThreadUntil,
    now,
  });
}

/** "Window closes in 3d 4h" / "Reply window closed", for the chat header. */
export function messagingWindowLabel(window: MessagingWindow, now = new Date()): string {
  if (window.state === "closed" || !window.closesAt) return "Reply window closed";
  const ms = Math.max(0, window.closesAt.getTime() - now.getTime());
  const days = Math.floor(ms / (24 * HOUR_MS));
  const hours = Math.floor((ms % (24 * HOUR_MS)) / HOUR_MS);
  const left = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  return window.state === "open"
    ? `Window closes in ${left}`
    : `Window closes in ${left} · only a person can reply`;
}
