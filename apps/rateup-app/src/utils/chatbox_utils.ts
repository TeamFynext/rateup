import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import type { WaSettings } from "@/api/whatsapp/types";
import { MessagePlatform } from "@/constants/enums";

dayjs.extend(relativeTime);
dayjs.extend(utc);

export const namePreview = (name_: any) => {
  if (name_) {
    const name1 = name_.trim();
    const nameArray = name1.split(" ");
    if (nameArray.length >= 2) {
      return (nameArray[0][0] + nameArray[1][0]).toUpperCase();
    }
    return nameArray[0].slice(0, 2).toUpperCase();
  } else {
    // Empty string, not `0` — every caller drops this straight into a <Text>,
    // so a numeric fallback painted a literal "0" inside the avatar circle.
    return "";
  }
};

export function isInboxSessionExpired(timeStamp: string) {
  if (!timeStamp) return true;
  const currentTime = dayjs().utc();
  const givenTime = dayjs(timeStamp).utc();
  const diffInHours = currentTime.diff(givenTime, "hours");
  return diffInHours >= 24;
}

export function generateInternalMessageId() {
  return "wamid." + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

/** Longest sender name shown in front of an inbox row's last message, ellipsis included. */
export const LAST_MESSAGE_SENDER_MAX = 20;

const timeOf = (value: unknown) => {
  const time = new Date((value as string) ?? 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Who sent a row's last message, for the "Name: message" preview. Only outgoing
 * sends carry one — a customer's message, a private note or a system line gets
 * nothing.
 *
 * The name comes from the message's `sender`. The socket frame and the
 * optimistic placeholder both carry it; the list endpoint's `lastMessage` does
 * not, but the row's `messages` (the ticket's newest ten, with senders) holds
 * the same message, so it is looked up there. The current user reads as "You".
 * Automated sends — campaigns, chatbot, auto-replies — have no user behind them
 * and return undefined, so the preview stays unprefixed.
 */
export function getLastMessageSender(
  contact:
    | {
        lastMessage?: any;
        messages?: any[] | null;
      }
    | null
    | undefined,
  currentUserId: string | null | undefined,
): string | undefined {
  const last = contact?.lastMessage;
  if (last?.messageBody?.exchangeProcess !== "send") return undefined;

  const lastTime = timeOf(last.waCreatedAt);
  const stored = last.sender
    ? last
    : contact?.messages?.find(
        (m) =>
          m?.messageBody?.exchangeProcess === "send" &&
          ((last.messageId && m.messageId === last.messageId) ||
            (lastTime > 0 && timeOf(m.waCreatedAt) === lastTime)),
      );

  const sendBy = stored?.sendBy ?? last.sendBy;
  if (currentUserId && sendBy === currentUserId) return "You";

  const name = stored?.sender?.name?.trim();
  if (!name) return undefined;
  const chars = Array.from(name);
  return chars.length > LAST_MESSAGE_SENDER_MAX
    ? `${chars
        .slice(0, LAST_MESSAGE_SENDER_MAX - 1)
        .join("")
        .trimEnd()}…`
    : name;
}

export type ResolvedChannel = {
  platform: MessagePlatform;
  /** What to show: the org's own label for the number/account where set, else the raw identifier. */
  label: string;
  /** The underlying account when `label` is a display name — worth showing next to it. */
  account?: string;
  /** False when no connected account matches — the channel was disconnected since. */
  isConnected: boolean;
};

const digitsOf = (value?: string | null) => (value ?? "").replace(/\D/g, "");

/*
 * The channel helpers below are ported from rateup-ui so both inboxes name and
 * pick a channel the same way — `getContactChannelSource` from
 * `src/utils/whatsapp/inbox.ts`, `findChannelAccount` and `resolveChannel` from
 * `src/components/input/channelOptions.ts`. Keep them in step.
 */

/** The channel a conversation ran on, and which connected account it ran through. */
export type ContactChannelSource = {
  platform: MessagePlatform;
  /**
   * The connected account the messages went to: a WhatsApp number, an Instagram
   * account id or a Facebook page id. Null for webchat, for internal-only rows,
   * and for legacy messages written before the identifier was recorded.
   */
  identifier: string | null;
};

type ChannelSourceMessage = {
  sourcePlatform?: MessagePlatform | string | null;
  sourceIdentifier?: string | null;
};

/**
 * Resolve the channel a conversation lives on, together with the account it came
 * in on.
 *
 * `lastMessage` alone is not enough: when the last message is a private note or a
 * system message its `sourcePlatform` is "INTERNAL" and its `sourceIdentifier` is
 * "internal". Read straight off it, the row's chip said "internal", the header
 * fell back to WhatsApp on an Instagram thread, and the reply box found no number
 * to send on. Resolve in order of confidence:
 *   1. the last message, when it is a real channel message
 *   2. the most recent non-internal message in `messages` (newest first)
 *   3. the contact's channel identity (igsId → Instagram, psid → Facebook)
 *   4. WhatsApp as the default
 *
 * The identifier is read off the same message that settled the platform, so the
 * pair always describes one real send. Steps 3 and 4 carry no identifier.
 */
export function getContactChannelSource(
  contact?: {
    lastMessage?: ChannelSourceMessage | null;
    messages?: (ChannelSourceMessage | null | undefined)[] | null;
    igsId?: string | null;
    psid?: string | null;
  } | null,
): ContactChannelSource {
  const asChannel = (p?: MessagePlatform | string | null): MessagePlatform | undefined =>
    p && p !== "INTERNAL" ? (p as MessagePlatform) : undefined;

  const fromMessage = (m?: ChannelSourceMessage | null): ContactChannelSource | undefined => {
    const platform = asChannel(m?.sourcePlatform);
    return platform ? { platform, identifier: m?.sourceIdentifier || null } : undefined;
  };

  return (
    fromMessage(contact?.lastMessage) ??
    fromMessage(contact?.messages?.find((m) => asChannel(m?.sourcePlatform))) ?? {
      platform: contact?.igsId
        ? MessagePlatform.INSTAGRAM
        : contact?.psid
          ? MessagePlatform.FACEBOOK
          : MessagePlatform.WHATSAPP,
      identifier: null,
    }
  );
}

/**
 * The connected account a message's `sourceIdentifier` names, or undefined when
 * none of the org's accounts match (disconnected since, or a legacy row that
 * recorded no identifier).
 *
 * WhatsApp identifiers are matched on digits alone: the same number is written
 * with a leading `+` by the webhook and without one by our own sends, so a plain
 * `===` misses half of every thread.
 */
export function findChannelAccount(
  waSettings: WaSettings | undefined,
  platform: MessagePlatform | string | null | undefined,
  identifier: string | null | undefined,
): WaSettings[number] | undefined {
  if (!identifier || !platform || platform === MessagePlatform.WEBCHAT) return undefined;

  return (waSettings ?? []).find((account) => {
    if (platform === MessagePlatform.WHATSAPP) {
      const phoneDigits = digitsOf(account.phone);
      return (
        (Boolean(phoneDigits) && phoneDigits === digitsOf(identifier)) ||
        account.phoneId === identifier
      );
    }
    if (platform === MessagePlatform.INSTAGRAM) {
      return Boolean(account.ibaId) && account.ibaId === identifier;
    }
    if (platform === MessagePlatform.FACEBOOK) {
      return Boolean(account.fbPageId) && account.fbPageId === identifier;
    }
    return false;
  });
}

/**
 * Name the channel a message arrived on, given what the message recorded
 * (`sourcePlatform` + `sourceIdentifier`) and the org's connected accounts.
 *
 * A number that matches no connected account is still named — the org may have
 * disconnected it since, and the digits are more use than an empty chip.
 *
 * Returns null when there is nothing to name: webchat, internal notes, and legacy
 * messages that predate the identifier. Feed it `getContactChannelSource`, not a
 * raw `lastMessage`, or an internal note comes back named "internal".
 */
export function resolveChannel(
  waSettings: WaSettings | undefined,
  platform: MessagePlatform | string | null | undefined,
  identifier: string | null | undefined,
): ResolvedChannel | null {
  if (!identifier || !platform || platform === MessagePlatform.WEBCHAT) return null;

  const account = findChannelAccount(waSettings, platform, identifier);

  if (account) {
    if (platform === MessagePlatform.WHATSAPP) {
      return {
        platform: MessagePlatform.WHATSAPP,
        label: account.phoneDisplayName || account.phone || identifier,
        account: account.phoneDisplayName ? account.phone : undefined,
        isConnected: true,
      };
    }

    if (platform === MessagePlatform.INSTAGRAM) {
      const handle = account.igUserName ? `@${account.igUserName}` : identifier;
      return {
        platform: MessagePlatform.INSTAGRAM,
        label: account.igDisplayName || handle,
        account: account.igDisplayName ? handle : undefined,
        isConnected: true,
      };
    }

    if (platform === MessagePlatform.FACEBOOK) {
      return {
        platform: MessagePlatform.FACEBOOK,
        label: account.fbUserName || identifier,
        isConnected: true,
      };
    }
  }

  return {
    platform: platform as MessagePlatform,
    label: platform === MessagePlatform.WHATSAPP ? `+${digitsOf(identifier)}` : identifier,
    isConnected: false,
  };
}
