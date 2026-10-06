import type { Channel } from "@/backend/channels/channels.api";
import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { MessagePlatform } from "@/types/enums.ts";

export interface ChannelOption {
  /** What the inbox filter stores: a phone number (or phone id), or the platform's account id. */
  value: string;
  label: string;
  status?: string;
  platform: MessagePlatform;
}

interface ChannelOptionsInput {
  platform?: MessagePlatform | `${MessagePlatform}` | "all";
  /** WhatsApp entries carry the bare phone number rather than the phone id. */
  usePhoneNumber?: boolean;
  filterIds?: string[];
}

const digitsOf = (value?: string | null) => (value ?? "").replace(/\D/g, "");

/**
 * The connected channels, one entry per channel of any platform — each WhatsApp number,
 * Instagram account and Messenger Page, and whatever platform joins the registry next.
 *
 * Shared so the inbox's Channel filter and every AccountSelector offer the same
 * list with the same values; the inbox filter and the API match on `value`.
 */
export function getChannelOptions(
  channels: Channel[] | undefined,
  {
    platform = MessagePlatform.WHATSAPP,
    usePhoneNumber = false,
    filterIds,
  }: ChannelOptionsInput = {},
): ChannelOption[] {
  const options: ChannelOption[] = [];
  const include = (value: string | null | undefined): value is string =>
    Boolean(value) && (!filterIds || filterIds.includes(value ?? ""));

  for (const channel of channels ?? []) {
    const channelPlatform = channel.platform as MessagePlatform;
    if (platform !== "all" && platform !== channelPlatform) continue;

    // A WhatsApp number is addressed by its phone id, or by the number itself where the
    // caller filters messages; every other platform by its own account id.
    const whatsapp = channelPlatform === MessagePlatform.WHATSAPP;
    const value =
      whatsapp && usePhoneNumber ? channel.address?.replace("+", "") : channel.accountId;
    if (!include(value)) continue;

    options.push({
      value,
      label: whatsapp
        ? channel.name || channel.address || channel.accountId
        : (channel.username ?? channel.name ?? channel.accountId),
      status: channel.status,
      platform: channelPlatform,
    });
  }

  return options;
}

/** A connected channel, resolved back from what a message recorded it as. */
export interface ResolvedChannel {
  platform: MessagePlatform;
  /** The org's own name for the channel, falling back to the account itself. */
  label: string;
  /** The account: a WhatsApp number, an IG handle or a page id. Omitted when it *is* the label. */
  account?: string;
  /** False when no connected account matches — the channel was disconnected since. */
  isConnected: boolean;
}

/**
 * The connected WhatsApp number a message's `sourceIdentifier` names, or undefined
 * when none of the org's numbers match (disconnected since, a legacy row that
 * recorded no identifier, or a platform other than WhatsApp).
 *
 * Identifiers are matched on digits alone: the same number is written with a
 * leading `+` by the webhook and without one by our own sends, so a plain `===`
 * misses half of every thread. Matching a number to a channel with `===` is the
 * bug this exists to stop anyone writing again.
 */
export function findChannelAccount(
  waSettings: WaSettings | undefined,
  platform: MessagePlatform | string | null | undefined,
  identifier: string | null | undefined,
): NonNullable<WaSettings>[number] | undefined {
  if (!identifier || platform !== MessagePlatform.WHATSAPP) return undefined;

  return (waSettings ?? []).find((account) => {
    const phoneDigits = digitsOf(account.phone);
    return (
      (Boolean(phoneDigits) && phoneDigits === digitsOf(identifier)) ||
      account.phoneId === identifier
    );
  });
}

/**
 * The connected channel a message's `sourcePlatform` + `sourceIdentifier` name, on that
 * platform only. WhatsApp matches the number on digits alone (or its phone id); every
 * other platform matches its account id.
 */
export function findChannel(
  channels: Channel[] | undefined,
  platform: MessagePlatform | string | null | undefined,
  identifier: string | null | undefined,
): Channel | undefined {
  if (!identifier || !platform) return undefined;
  return channels?.find((channel) => {
    if (channel.platform !== platform) return false;
    if (platform === MessagePlatform.WHATSAPP) {
      const digits = digitsOf(channel.address);
      return (
        (Boolean(digits) && digits === digitsOf(identifier)) || channel.accountId === identifier
      );
    }
    return channel.accountId === identifier;
  });
}

/**
 * Name the channel a message arrived on, given what the message recorded
 * (`sourcePlatform` + `sourceIdentifier`) and the org's connected channels.
 *
 * A number that matches no connected channel is still named — the org may have
 * disconnected it since, and the digits are more use than an empty chip.
 *
 * Returns null when there is nothing to name: webchat, internal notes, and legacy
 * messages that predate the identifier.
 */
export function resolveChannel(
  channels: Channel[] | undefined,
  platform: MessagePlatform | string | null | undefined,
  identifier: string | null | undefined,
): ResolvedChannel | null {
  if (!identifier || !platform || platform === MessagePlatform.WEBCHAT) return null;

  const channel = findChannel(channels, platform, identifier);
  if (channel && platform === MessagePlatform.WHATSAPP) {
    return {
      platform: MessagePlatform.WHATSAPP,
      label: channel.name || channel.address || identifier,
      account: channel.name ? (channel.address ?? undefined) : undefined,
      isConnected: true,
    };
  }
  if (channel && channel.username) {
    const handle = `@${channel.username}`;
    return {
      platform: platform as MessagePlatform,
      label: channel.name || handle,
      account: channel.name ? handle : undefined,
      isConnected: true,
    };
  }
  if (channel) {
    return {
      platform: platform as MessagePlatform,
      label: channel.name || channel.accountId,
      isConnected: true,
    };
  }

  return {
    platform: platform as MessagePlatform,
    label: platform === MessagePlatform.WHATSAPP ? `+${digitsOf(identifier)}` : identifier,
    isConnected: false,
  };
}
