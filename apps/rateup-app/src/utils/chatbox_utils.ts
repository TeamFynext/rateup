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

/**
 * Name the channel a message arrived on, given what the message recorded
 * (`sourcePlatform` + `sourceIdentifier`) and the org's connected accounts.
 *
 * Ported from the web app's `resolveChannel` (rateup-ui
 * `src/components/input/channelOptions.ts`) so both inboxes name a number the
 * same way; keep the two in step.
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
