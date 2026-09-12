import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { MessagePlatform } from "@/types/enums.ts";

export interface ChannelOption {
  /** What the inbox filter stores: a phone number (or phone id), an IG account id or a FB page id. */
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

/**
 * The connected channels, flattened out of the WhatsApp settings rows — one entry
 * per WhatsApp number, Instagram account and Facebook page.
 *
 * Shared so the inbox's Channel filter and every AccountSelector offer the same
 * list with the same values; the inbox filter and the API match on `value`.
 */
export function getChannelOptions(
  waSettings: WaSettings | undefined,
  {
    platform = MessagePlatform.WHATSAPP,
    usePhoneNumber = false,
    filterIds,
  }: ChannelOptionsInput = {},
): ChannelOption[] {
  const options: ChannelOption[] = [];
  const include = (value: string) => Boolean(value) && (!filterIds || filterIds.includes(value));

  for (const account of waSettings ?? []) {
    if (platform === "all" || platform === MessagePlatform.WHATSAPP) {
      const value = usePhoneNumber ? account?.phone?.replace("+", "") : account.phoneId;
      if (include(value)) {
        options.push({
          value,
          label: account?.phoneDisplayName || account.phone,
          status: account.status,
          platform: MessagePlatform.WHATSAPP,
        });
      }
    }

    if ((platform === "all" || platform === MessagePlatform.INSTAGRAM) && include(account.ibaId)) {
      options.push({
        value: account.ibaId,
        label: account.igUserName ?? account.ibaId,
        status: account.status,
        platform: MessagePlatform.INSTAGRAM,
      });
    }

    if (
      (platform === "all" || platform === MessagePlatform.FACEBOOK) &&
      include(account.fbPageId)
    ) {
      options.push({
        value: account.fbPageId,
        label: account.fbUserName ?? account.fbPageId,
        status: account.status,
        platform: MessagePlatform.FACEBOOK,
      });
    }
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

const digitsOf = (value?: string | null) => (value ?? "").replace(/\D/g, "");

/**
 * Name the channel a message arrived on, given what the message recorded
 * (`sourcePlatform` + `sourceIdentifier`) and the org's connected accounts.
 *
 * WhatsApp identifiers are matched on digits alone: the same number is written
 * with a leading `+` by the webhook and without one by our own sends, so a string
 * compare misses half the thread's messages. A number that matches no connected
 * account is still named — the org may have disconnected it since, and the digits
 * are more use than an empty chip.
 *
 * Returns null when there is nothing to name: webchat, internal notes, and legacy
 * messages that predate the identifier.
 */
export function resolveChannel(
  waSettings: WaSettings | undefined,
  platform: MessagePlatform | string | null | undefined,
  identifier: string | null | undefined,
): ResolvedChannel | null {
  if (!identifier || !platform || platform === MessagePlatform.WEBCHAT) return null;

  for (const account of waSettings ?? []) {
    if (platform === MessagePlatform.WHATSAPP) {
      const phoneDigits = digitsOf(account.phone);
      const matches =
        (phoneDigits && phoneDigits === digitsOf(identifier)) || account.phoneId === identifier;
      if (matches) {
        return {
          platform: MessagePlatform.WHATSAPP,
          label: account.phoneDisplayName || account.phone || identifier,
          account: account.phoneDisplayName ? account.phone : undefined,
          isConnected: true,
        };
      }
    }

    if (platform === MessagePlatform.INSTAGRAM && account.ibaId && account.ibaId === identifier) {
      const handle = account.igUserName ? `@${account.igUserName}` : account.ibaId;
      return {
        platform: MessagePlatform.INSTAGRAM,
        label: account.igDisplayName || handle,
        account: account.igDisplayName ? handle : undefined,
        isConnected: true,
      };
    }

    if (platform === MessagePlatform.FACEBOOK && account.fbPageId === identifier) {
      return {
        platform: MessagePlatform.FACEBOOK,
        label: account.fbUserName || account.fbPageId,
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

/**
 * Whether the org runs more than one channel. The per-row channel chip is only
 * worth its space when there is a choice — a single-number org would get the same
 * label on every row.
 */
export function hasMultipleChannels(waSettings: WaSettings | undefined): boolean {
  return getChannelOptions(waSettings, { platform: "all" }).length > 1;
}
