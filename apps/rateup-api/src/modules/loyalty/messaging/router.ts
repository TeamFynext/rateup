import { LoyaltyChannel } from "./channelIds.js";
import type { LoyaltyChannelId } from "./channelIds.js";
import { getLoyaltyChannel } from "./registry.js";
import type { LoyaltyRecipient, ProgramForSend, SendIntent } from "./types.js";

/**
 * The channels to try, in order. A notification goes to the member's own choice first
 * when the programme offers it, then down the programme's list. A reply goes back on the
 * channel the customer wrote on and nowhere else — whatever the programme offers, a
 * customer who writes in gets an answer.
 */
export function candidateChannels(
  program: Pick<ProgramForSend, "enabledChannels"> | null,
  recipient: Pick<LoyaltyRecipient, "preferredChannel">,
  intent: SendIntent,
): LoyaltyChannelId[] {
  const registered = (id: LoyaltyChannelId) => getLoyaltyChannel(id) !== undefined;
  if (intent.kind === "reply") return registered(intent.channel) ? [intent.channel] : [];

  const enabled = program?.enabledChannels?.length
    ? program.enabledChannels
    : [LoyaltyChannel.WHATSAPP];
  const preferred =
    recipient.preferredChannel && enabled.includes(recipient.preferredChannel)
      ? [recipient.preferredChannel]
      : [];
  return [...new Set([...preferred, ...enabled])].filter(registered);
}
