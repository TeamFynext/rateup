import { systemText, textMessage, type SystemTextKey } from "./content.js";
import { sendLoyalty } from "./send.js";
import type { LoyaltyChannelId, LoyaltyMessage, LoyaltySendOutcome } from "./types.js";

/** The customer who just wrote in, and where: the answer goes back the same way. */
export interface InboundReplyContext {
  orgId: string;
  channel: LoyaltyChannelId;
  /** Their address on that channel — a phone number for WhatsApp. */
  from: string;
  /** The business number they wrote to, when the channel has several. */
  phoneId?: string | null;
  name?: string | null;
}

export async function replyLoyalty(
  ctx: InboundReplyContext,
  message: LoyaltyMessage,
): Promise<LoyaltySendOutcome> {
  return await sendLoyalty({
    orgId: ctx.orgId,
    to: { phone: ctx.from, name: ctx.name },
    message,
    intent: { kind: "reply", channel: ctx.channel, phoneId: ctx.phoneId },
  });
}

export async function replyText(
  ctx: InboundReplyContext,
  text: string,
): Promise<LoyaltySendOutcome> {
  return await replyLoyalty(ctx, textMessage("reply:text", text));
}

export async function replySystem(
  ctx: InboundReplyContext,
  key: SystemTextKey,
): Promise<LoyaltySendOutcome> {
  return await replyLoyalty(ctx, systemText(key));
}
