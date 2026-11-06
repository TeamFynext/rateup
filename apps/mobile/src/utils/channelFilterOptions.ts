import type { Channel } from "@/api/channels/channels.api";
import { WEBCHAT_FILTER } from "@/api/channels/channels.api";
import type { WaSettings } from "@/api/whatsapp/types";

export type ChannelFilterOption = {
  label: string;
  /** What the inbox filter's `phone` key carries; the API matches each kind (`filterChats`). */
  value: string;
  /** Drives the chip's icon; absent for "All Channels". */
  platform?: Channel["platform"];
};

/**
 * The Channel section of the inbox filter: every channel the org has, not just its
 * WhatsApp numbers. Mirrors rateup-ui's channel filter:
 *
 * - WhatsApp: the number (its name in front when it has one). The value stays the
 *   number, as before, so a filter picked earlier keeps matching; the API compares digits.
 * - Instagram and Messenger: the account or Page name, else the handle, else the id.
 *   The value is the account id.
 * - Web chat, when the org has had webchat visitors. The value is `"webchat"`.
 *
 * Without the channel list (still loading, or the request failed) it falls back to the
 * WhatsApp numbers from the settings, which is what this section used to show.
 */
export function channelFilterOptions(
  channels: Channel[] | undefined,
  waSettings: WaSettings | undefined,
  webchatActive: boolean,
): ChannelFilterOption[] {
  const options: ChannelFilterOption[] = [{ label: "All Channels", value: "all" }];

  if (channels?.length) {
    for (const channel of channels) {
      if (channel.platform === "WHATSAPP") {
        const number = channel.address || channel.accountId;
        options.push({
          label: channel.name ? `${channel.name} · ${number}` : number,
          value: number,
          platform: "WHATSAPP",
        });
      } else if (channel.platform === "INSTAGRAM" || channel.platform === "FACEBOOK") {
        options.push({
          label:
            channel.name || (channel.username ? `@${channel.username}` : null) || channel.accountId,
          value: channel.accountId,
          platform: channel.platform,
        });
      }
    }
  } else {
    for (const account of waSettings ?? []) {
      if (account.phone)
        options.push({ label: account.phone, value: account.phone, platform: "WHATSAPP" });
    }
  }

  if (webchatActive)
    options.push({ label: "Web chat", value: WEBCHAT_FILTER, platform: "WEBCHAT" });
  return options;
}
