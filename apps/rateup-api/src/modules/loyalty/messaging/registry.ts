import type { LoyaltyChannelId } from "./channelIds.js";
import { whatsappChannel } from "./channels/whatsapp/adapter.js";
import type { LoyaltyChannel } from "./types.js";

/**
 * Every medium loyalty messages can go out on. A new one is an adapter implementing
 * `LoyaltyChannel` plus a line here and in `AVAILABLE_LOYALTY_CHANNELS`; nothing that sends
 * a message changes.
 *
 * Built on call rather than at import: the WhatsApp adapter reaches the flow sender, which
 * imports the feedback code, which sends through here — a top-level table could be read
 * before the adapter had finished loading.
 */
export function loyaltyChannels(): Partial<Record<LoyaltyChannelId, LoyaltyChannel>> {
  return { WHATSAPP: whatsappChannel };
}

export function getLoyaltyChannel(id: LoyaltyChannelId): LoyaltyChannel | undefined {
  return loyaltyChannels()[id];
}
