import type { TFunction } from "i18next";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import type { WaTemplateDraftPayload } from "@/backend/whatsapp/whatsapp.api";
import { TemplateType } from "@/types/enums.ts";

/**
 * Every message the loyalty programme can say on WhatsApp, in one list.
 *
 * Two kinds. An **event** message is a Meta template a transaction or a schedule sends —
 * `key` is the `LoyaltyEventType`, and `params` names what the dispatcher puts into
 * `{{1}}`, `{{2}}` … in that order (the contract with `loyaltyWaDispatcher` and the crons
 * on the API). A **keyword** message answers something the customer texts — `key` is the
 * `LoyaltyWaCommand.type`, `keyword` the word to listen for, and `params` what the inbound
 * handler substitutes; the reply itself is plain text, with a template only for customers
 * who have never messaged the business.
 *
 * `templateName` / `body` / `example` are the starter each message can be created from.
 * The event names mirror `LOYALTY_EVENT_TEMPLATE_NAMES` on the API; keep them in step.
 */

export type LoyaltyMessageKind = "event" | "keyword";

export type LoyaltyEventGroup = "notification" | "reminder";

export interface LoyaltyMessageVariable {
  /** Written into the message verbatim, e.g. `{{1}}`. */
  token: string;
  label: string;
}

interface LoyaltyMessageBase {
  label: string;
  /** One line on what the message is for. */
  description: string;
  /** What fills `{{1}}`, `{{2}}` … in that order. Empty when the message takes none. */
  params: string[];
  /** A ready-to-submit Meta template, when the merchant has none yet. */
  templateName: string;
  body: string;
  example: string[];
}

export interface LoyaltyEventDefinition extends LoyaltyMessageBase {
  kind: "event";
  eventType: LoyaltyEventType;
  group: LoyaltyEventGroup;
}

export interface LoyaltyKeywordDefinition extends LoyaltyMessageBase {
  kind: "keyword";
  type: string;
  /** The word to listen for, before the merchant renames it. */
  keyword: string;
}

export type LoyaltyMessageDefinition = LoyaltyEventDefinition | LoyaltyKeywordDefinition;

export function loyaltyMessageCatalog(t: TFunction): LoyaltyMessageDefinition[] {
  return [...loyaltyEventCatalog(t), ...loyaltyKeywordCatalog(t)];
}

export function loyaltyEventCatalog(t: TFunction): LoyaltyEventDefinition[] {
  const name = t("customer name");
  return [
    {
      kind: "event",
      eventType: LoyaltyEventType.POINTS_ISSUED,
      group: "notification",
      label: t("When points are earned"),
      description: t("Sent after every purchase that earns points."),
      params: [name, t("points earned"), t("balance after")],
      templateName: "loyalty_points_issued",
      body: "Hi {{1}}, you just earned {{2}} points. Your balance is now {{3}}.",
      example: ["Anjali", "43", "1283"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.POINTS_ADJUSTED,
      group: "notification",
      label: t("When points are adjusted"),
      description: t("Sent when staff correct a balance and the change is approved."),
      params: [name, t("change"), t("balance after")],
      templateName: "loyalty_points_adjusted",
      body: "Hi {{1}}, your points were adjusted by {{2}}. Your balance is now {{3}}.",
      example: ["Anjali", "-24", "1259"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.REWARD_ISSUED,
      group: "notification",
      label: t("When a gift is given"),
      description: t("Sent when staff hand a customer a free gift with a code."),
      params: [name, t("reward"), t("code"), t("cost")],
      templateName: "loyalty_reward_issued",
      body: "Hi {{1}}, you have a gift waiting: {{2}}. Show code {{3}} at the counter.",
      example: ["Anjali", "Birthday brownie", "KC-4471"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.REWARD_REDEEMED,
      group: "notification",
      label: t("When a reward is redeemed"),
      description: t("Sent when a customer spends points on a reward."),
      params: [name, t("reward"), t("code"), t("points used")],
      templateName: "loyalty_reward_redeemed",
      body: "Hi {{1}}, your reward {{2}} is confirmed. Show code {{3}} to redeem it ({{4}} points used).",
      example: ["Anjali", "Free regular hot drink", "KC-4471", "500"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.TIER_UPGRADED,
      group: "reminder",
      label: t("Tier upgrade"),
      description: t("Sent the moment someone reaches a new tier."),
      params: [name, t("new tier")],
      templateName: "loyalty_tier_upgraded",
      body: "Congratulations {{1}} — you are now {{2}} and earn faster from today.",
      example: ["Anjali", "Gold"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.BIRTHDAY,
      group: "reminder",
      label: t("Birthday gift"),
      description: t("Sent on the customer's birthday, with the gift you pick."),
      params: [name, t("gift")],
      templateName: "loyalty_birthday",
      body: "Happy birthday {{1}}! A {{2}} is waiting for you this week.",
      example: ["Anjali", "brownie"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.INACTIVITY_REMINDER,
      group: "reminder",
      label: t("Inactivity reminder"),
      description: t("Sent after a quiet spell, to bring a customer back."),
      params: [name, t("balance")],
      templateName: "loyalty_inactivity_reminder",
      body: "We miss you {{1}}. You still have {{2}} points waiting.",
      example: ["Anjali", "1283"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.POINTS_EXPIRY_ALERT,
      group: "reminder",
      label: t("Points expiry warning"),
      description: t("Sent before points expire, if expiry is on in Settings."),
      params: [name, t("points"), t("date")],
      templateName: "loyalty_points_expiry_alert",
      body: "{{1}}, {{2}} points expire on {{3}}. Use them before then.",
      example: ["Anjali", "300", "30 Sep"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.POINTS_EXPIRED,
      group: "reminder",
      label: t("Points expired"),
      description: t("Sent once points have expired."),
      params: [name, t("points")],
      templateName: "loyalty_points_expired",
      body: "Hi {{1}}, {{2}} points expired today.",
      example: ["Anjali", "300"],
    },
  ];
}

/**
 * The five keywords `handleLoyaltyWaCommand` on the API dispatches; a keyword of any other
 * kind would be stored but never answered. Their `params` are the inbound handler's
 * substitutions, positionally — so the list is the order, not a menu.
 */
export function loyaltyKeywordCatalog(t: TFunction): LoyaltyKeywordDefinition[] {
  return [
    {
      kind: "keyword",
      type: "CustomerRegistration",
      label: t("Joining the program"),
      description: t("The welcome sent the moment someone signs up."),
      keyword: "join",
      params: [t("their name")],
      templateName: "loyalty_customer_registration",
      body: "Hi {{1}}, welcome to our loyalty program!",
      example: ["Anjali"],
    },
    {
      kind: "keyword",
      type: "PointInformation",
      label: t("Checking their balance"),
      description: t("Replies with what they have, spent and earned."),
      keyword: "points",
      params: [t("balance"), t("redeemed"), t("earned all time")],
      templateName: "loyalty_point_information",
      body: "Your current point balance is {{1}}. You have redeemed {{2}} points and earned a total of {{3}} points.",
      example: ["50", "20", "70"],
    },
    {
      kind: "keyword",
      type: "Referral",
      label: t("Referring a friend"),
      description: t("Sends their referral code and joining link."),
      keyword: "refer",
      params: [t("referral code"), t("joining link")],
      templateName: "loyalty_referral",
      body: "Your referral code is {{1}}. Share this link: {{2}}",
      example: ["ABC123", "https://wa.me/919000000000?text=Join"],
    },
    {
      kind: "keyword",
      type: "RewardsIssued",
      label: t("Browsing rewards"),
      description: t("Lists what they can redeem right now."),
      keyword: "rewards",
      params: [],
      templateName: "loyalty_rewards_issued",
      body: "Here is what you can redeem right now. Reply with a reward to claim it.",
      example: [],
    },
    {
      kind: "keyword",
      type: "CustomerRemoval",
      label: t("Leaving the program"),
      description: t("Removes them, and says how to come back."),
      keyword: "stop",
      params: [],
      templateName: "loyalty_customer_removal",
      body: "You have been removed from the loyalty program. Reply JOIN any time to come back.",
      example: [],
    },
  ];
}

export function loyaltyEventDefinition(
  t: TFunction,
  eventType: string,
): LoyaltyEventDefinition | undefined {
  return loyaltyEventCatalog(t).find((definition) => definition.eventType === eventType);
}

export function loyaltyKeywordDefinition(
  t: TFunction,
  type: string,
): LoyaltyKeywordDefinition | undefined {
  return loyaltyKeywordCatalog(t).find((kind) => kind.type === type);
}

/** `["customer name", "points earned"]` → insertable `{{1}}`, `{{2}}` with those labels. */
export function messageVariables(params: readonly string[]): LoyaltyMessageVariable[] {
  return params.map((label, index) => ({ token: `{{${index + 1}}}`, label }));
}

/** "{{1}} balance · {{2}} redeemed" — the one-line hint under a message that takes variables. */
export function variableHint(params: readonly string[]): string {
  return messageVariables(params)
    .map((variable) => `${variable.token} ${variable.label}`)
    .join(" · ");
}

/**
 * A draft template on the chosen WhatsApp account, from a starter. Draft first: Meta
 * approval takes hours and a wrong number is cheap to fix before that.
 */
export function loyaltyDraftPayload(
  starter: Pick<LoyaltyMessageDefinition, "templateName" | "body" | "example">,
  whatsappSettingsPhoneId: string,
): WaTemplateDraftPayload {
  return {
    name: starter.templateName,
    header: null,
    language: "en",
    body: starter.body,
    footer: "Powered by rateup.app",
    category: "UTILITY",
    format: "NONE",
    buttons: [],
    status: "DRAFT",
    example: starter.example,
    templateType: TemplateType.LOYALTY,
    mediaCarousel: [],
    productCarousel: [],
    whatsappSettingsPhoneId,
    defaultValues: {
      catalog: {
        thumbnail_product_retailer_id: "",
        mpm: { sections: [] },
        spm: { product_retailer_id: "" },
        catalogId: "",
      },
      whatsappSettingsPhoneId,
    },
  };
}
