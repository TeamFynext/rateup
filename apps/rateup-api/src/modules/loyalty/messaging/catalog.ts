import { LoyaltyEventType } from "../../../types/enums.js";
import { LOYALTY_EVENT_TEMPLATE_NAMES } from "../loyaltyEventTemplates.js";

/**
 * Every automatic loyalty message, independent of the channel that carries it.
 *
 * `params` is the positional contract behind `{{1}}`, `{{2}}` … — the one place that
 * knows the order, shared by the event senders, the reminder sweeps and each channel's
 * templates. The UI's `loyaltyMessageCatalog.ts` labels the same order; keep them in step.
 *
 * `defaultBody` is what goes out when a programme has written nothing for the event. The
 * four the setup wizard submits keep the wizard's wording, so a default never contradicts
 * a template the merchant already has approved.
 */

export type EventParamKey =
  | "name"
  | "points"
  | "balance"
  | "rewardName"
  | "code"
  | "cost"
  | "tier"
  | "date"
  | "days"
  | "amount"
  | "years";

export interface LoyaltyEventDefinition {
  templateName: string;
  params: readonly EventParamKey[];
  defaultBody: string;
  /** Switched off with the programme's "points activity alerts". */
  alertClass?: "points";
  /** Carries a Join button that registers whoever taps it. */
  joinButton?: boolean;
  /** Sends with `defaultBody` until the programme saves a trigger row for it. */
  defaultOn?: boolean;
}

export type EventData = Partial<Record<EventParamKey, string | number | null | undefined>>;

const definitions: Record<LoyaltyEventType, Omit<LoyaltyEventDefinition, "templateName">> = {
  [LoyaltyEventType.POINTS_ISSUED]: {
    params: ["name", "points", "balance"],
    defaultBody: "Hi {{1}}, you just earned {{2}} points. Your balance is now {{3}}.",
    alertClass: "points",
  },
  [LoyaltyEventType.POINTS_ADJUSTED]: {
    params: ["name", "points", "balance"],
    defaultBody: "Hi {{1}}, your points were adjusted by {{2}}. Your balance is now {{3}}.",
    alertClass: "points",
  },
  [LoyaltyEventType.REWARD_ISSUED]: {
    params: ["name", "rewardName", "code", "cost"],
    defaultBody: "Hi {{1}}, you have a gift waiting: {{2}}. Show code {{3}} at the counter.",
  },
  [LoyaltyEventType.REWARD_REDEEMED]: {
    params: ["name", "rewardName", "code", "cost"],
    defaultBody:
      "Hi {{1}}, your reward {{2}} is confirmed. Show code {{3}} to redeem it. ({{4}} points used)",
  },
  [LoyaltyEventType.TIER_UPGRADED]: {
    params: ["name", "tier"],
    defaultBody: "Congratulations {{1}} — you've reached {{2}}! Enjoy your new benefits.",
  },
  [LoyaltyEventType.BIRTHDAY]: {
    params: ["name", "rewardName"],
    defaultBody: "Happy birthday, {{1}}! Here's a little something from us — drop in and enjoy.",
  },
  [LoyaltyEventType.INACTIVITY_REMINDER]: {
    params: ["name", "balance"],
    defaultBody: "We miss you {{1}}. You still have {{2}} points waiting.",
  },
  [LoyaltyEventType.POINTS_EXPIRY_ALERT]: {
    params: ["name", "points", "date"],
    defaultBody: "Hi {{1}}, {{2}} points expire on {{3}}. Use them before then.",
  },
  [LoyaltyEventType.POINTS_EXPIRED]: {
    params: ["name", "points"],
    defaultBody: "Hi {{1}}, {{2}} points expired today.",
  },
  [LoyaltyEventType.TIER_AT_RISK]: {
    params: ["name", "tier", "days", "amount"],
    defaultBody: "Hi {{1}}, your {{2}} status ends in {{3}} days. Spend {{4}} more to keep it.",
  },
  [LoyaltyEventType.REWARD_EXPIRING]: {
    params: ["name", "rewardName", "date", "code"],
    defaultBody: "Hi {{1}}, your {{2}} expires on {{3}}. Show code {{4}} at the counter.",
  },
  [LoyaltyEventType.SIGNUP_ANNIVERSARY]: {
    params: ["name", "years", "balance"],
    defaultBody: "Hi {{1}}, it is {{2}} years since you joined us. You have {{3}} points to spend.",
  },
  [LoyaltyEventType.NEW_CUSTOMER_WELCOME]: {
    params: ["name"],
    defaultBody:
      "Hi {{1}}, thanks for getting in touch! Join our loyalty program to earn points on every visit. Tap the button below to join.",
    joinButton: true,
  },
  [LoyaltyEventType.MEMBER_JOINED]: {
    params: ["name"],
    defaultBody:
      "Hi {{1}}, welcome to our loyalty program! You will earn points on every visit, and we will message you here when you have a reward to claim.",
    defaultOn: true,
  },
};

export const LOYALTY_EVENT_CATALOG: Record<LoyaltyEventType, LoyaltyEventDefinition> =
  Object.fromEntries(
    Object.entries(definitions).map(([event, definition]) => [
      event,
      { ...definition, templateName: LOYALTY_EVENT_TEMPLATE_NAMES[event as LoyaltyEventType] },
    ]),
  ) as Record<LoyaltyEventType, LoyaltyEventDefinition>;

/** The event's variables in `{{n}}` order. A missing value is an empty string, as it always was. */
export function eventVars(event: LoyaltyEventType, data: EventData): string[] {
  return LOYALTY_EVENT_CATALOG[event].params.map((key) => {
    const value = data[key];
    return value === undefined || value === null ? "" : String(value);
  });
}
