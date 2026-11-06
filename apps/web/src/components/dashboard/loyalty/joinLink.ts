import { parsePhoneNumber } from "libphonenumber-js";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { WhatsappSettingsStatus } from "@/types/enums.ts";

/** The keyword reply that registers a customer — `LoyaltyTemplateTypes.CustomerRegistration`. */
export const JOIN_COMMAND_TYPE = "CustomerRegistration";

/** What the QR says when no join reply has been written yet. */
export const FALLBACK_JOIN_KEYWORD = "join";

interface KeywordSource {
  type: string;
  /** Null on a saved command whose keyword was cleared — treated as unset. */
  requestMessage: string | null;
}

/**
 * The word a customer texts to join. The saved reply wins over the starter pack's, because
 * the API matches inbound messages against what is stored, case-insensitively.
 */
export function pickJoinKeyword(
  saved: readonly KeywordSource[],
  preset: readonly KeywordSource[] = [],
): string {
  const from = (list: readonly KeywordSource[]) =>
    list.find((command) => command.type === JOIN_COMMAND_TYPE)?.requestMessage?.trim();
  return from(saved) || from(preset) || FALLBACK_JOIN_KEYWORD;
}

type ChannelLike = Pick<WaSettings[number], "id" | "phone" | "status">;

/**
 * The connected WhatsApp number the QR should open, as digits without "+". Prefers the
 * channel the programme names; a channel marked disconnected is never used. A legacy row
 * with no status is treated as live, the same reading `hasWhatsappChannel` takes.
 */
export function pickWhatsappNumber(
  channels: readonly ChannelLike[] | undefined,
  preferredId?: string | null,
): string | null {
  if (!channels?.length) return null;
  const live = channels.filter(
    (channel) => channel.phone && channel.status !== WhatsappSettingsStatus.DISCONNECTED,
  );
  const chosen = live.find((channel) => channel.id === preferredId) ?? live[0];
  const digits = chosen?.phone.replace(/\D/g, "") ?? "";
  return digits.length > 0 ? digits : null;
}

/** A `wa.me` link that opens a chat with the join keyword already typed. */
export function whatsappJoinUrl(number: string, keyword: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(keyword)}`;
}

/** "+91 98765 43210" for the poster caption; falls back to the bare digits. */
export function formatWhatsappNumber(digits: string): string {
  try {
    return parsePhoneNumber(`+${digits}`).formatInternational();
  } catch {
    return `+${digits}`;
  }
}
