import type { TFunction } from "i18next";

import type { LoyaltyChannel } from "@/backend/loyalty/program.api";

export function channelLabel(channel: LoyaltyChannel, t: TFunction): string {
  switch (channel) {
    case "WHATSAPP":
      return t("WhatsApp");
    case "RCS":
      return t("RCS");
    case "SMS":
      return t("SMS");
    case "EMAIL":
      return t("Email");
  }
}

/**
 * `enabled` with `channel` switched on or off. Order is fallback priority, so a channel
 * switched on goes last; the last one left cannot be switched off.
 */
export function toggleChannel(
  enabled: readonly LoyaltyChannel[],
  channel: LoyaltyChannel,
  on: boolean,
): LoyaltyChannel[] {
  if (on) return enabled.includes(channel) ? [...enabled] : [...enabled, channel];
  const next = enabled.filter((c) => c !== channel);
  return next.length > 0 ? next : [...enabled];
}
