import { LoyaltyChannel } from "../../../../generated/prisma/client.js";

export { LoyaltyChannel };
export type LoyaltyChannelId = LoyaltyChannel;

/**
 * The channels that have an adapter today. Kept apart from `registry.ts` so request
 * schemas can validate against it without loading any sender; `registry.test.ts` holds
 * the two to the same list.
 */
export const AVAILABLE_LOYALTY_CHANNELS: readonly LoyaltyChannelId[] = [LoyaltyChannel.WHATSAPP];

export function isAvailableChannel(channel: LoyaltyChannelId): boolean {
  return AVAILABLE_LOYALTY_CHANNELS.includes(channel);
}
