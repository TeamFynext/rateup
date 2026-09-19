import { LoyaltyEventType } from "../../../types/enums.js";
import { joinButtonLabel, LOYALTY_JOIN_PAYLOAD } from "../loyaltyEventTemplates.js";
import { LOYALTY_EVENT_CATALOG } from "./catalog.js";
import { fillPlaceholders } from "./render.js";
import type { LoyaltyMessage } from "./types.js";

/** The fixed replies the programme sends in its own voice, in one place for every channel. */
export const SYSTEM_TEXTS = {
  notMember: "You are not an active member of our loyalty programme",
  programUnavailable: "Sorry, our loyalty program is currently unavailable.",
  alreadyRegistered: "✅ You are already registered in our loyalty program.",
  noRewards: "No rewards are available for your current points right now.",
  rewardInvalid: "Selected reward is invalid.",
  rewardUnavailable: "This reward is no longer available or you do not have enough points.",
  redemptionCancelled: "Reward redemption cancelled.",
  redeemFailed: "Unable to redeem reward right now.",
  cardFailed: "Sorry, we could not send your card just now. Please try again in a moment.",
} as const;

export type SystemTextKey = keyof typeof SYSTEM_TEXTS;

export function textMessage(key: string, text: string): LoyaltyMessage {
  return { key, text };
}

export function systemText(key: SystemTextKey): LoyaltyMessage {
  return textMessage(`system:${key}`, SYSTEM_TEXTS[key]);
}

export function buildEventMessage(input: {
  event: LoyaltyEventType;
  vars: string[];
  /** The programme's words; null when the event has only a template to go on. */
  body: string | null;
  waTemplateId: string | null;
  /** The join keyword, for an event whose message carries a Join button. */
  joinKeyword?: string | null;
  /** Whether a template may be stood in for by an interactive message in an open window. */
  sessionInteractive: boolean;
}): LoyaltyMessage {
  const definition = LOYALTY_EVENT_CATALOG[input.event];
  const join = definition.joinButton === true;
  return {
    key: `event:${input.event}`,
    text: input.body === null ? null : fillPlaceholders(input.body, input.vars),
    ...(join && (input.sessionInteractive || !input.waTemplateId)
      ? {
          parts: {
            buttons: [{ id: LOYALTY_JOIN_PAYLOAD, title: joinButtonLabel(input.joinKeyword) }],
          },
        }
      : {}),
    ...(input.waTemplateId
      ? {
          artefacts: {
            WHATSAPP: {
              waTemplateId: input.waTemplateId,
              params: input.vars,
              ...(join ? { quickReplyPayload: [LOYALTY_JOIN_PAYLOAD] } : {}),
            },
          },
        }
      : {}),
  };
}

/**
 * A keyword's answer: the merchant's words, and a template only as the stand-in for when
 * there are none.
 */
export function buildKeywordReply(input: {
  key: string;
  text: string | null;
  waTemplateId: string | null;
  params: string[];
}): LoyaltyMessage {
  const text = input.text?.trim() ? input.text : null;
  return {
    key: input.key,
    text,
    ...(input.waTemplateId
      ? { artefacts: { WHATSAPP: { waTemplateId: input.waTemplateId, params: input.params } } }
      : {}),
  };
}
