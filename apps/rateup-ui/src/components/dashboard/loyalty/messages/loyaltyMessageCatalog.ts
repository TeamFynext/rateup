import type { TFunction } from "i18next";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import type { TemplateFormValues } from "@/components/whatsapp/templates/Details/template-form.ts";
import { TemplateType, WaTemplateStatus } from "@/types/enums.ts";
import { WHATSAPP_BUTTON_TYPE } from "@/utils/constants.ts";

/**
 * Every message the loyalty programme can say on WhatsApp, in one list.
 *
 * Two kinds. An **event** message is a Meta template a transaction or a schedule sends —
 * `key` is the `LoyaltyEventType`, and `params` names what the API puts into
 * `{{1}}`, `{{2}}` … in that order (the contract with `messaging/catalog.ts` there).
 * A **keyword** message answers something the customer texts — `key` is the
 * `LoyaltyWaCommand.type`, `keyword` the word to listen for, and `params` what the inbound
 * handler substitutes; the reply itself is plain text, with a template only for customers
 * who have never messaged the business.
 *
 * `templateName` / `body` / `example` are the starter each message can be created from.
 * The event names mirror `LOYALTY_EVENT_TEMPLATE_NAMES` on the API; keep them in step.
 *
 * Two of Meta's template rules bind every `body` here, and both are rejections at submit
 * time rather than warnings:
 *
 *  - A body may not **begin or end with a variable** — "Variables can't be at the start or
 *    end of the template." So a slot that wants to be last needs words after it.
 *  - Variables must be **numbered sequentially in order of appearance**, which is why a
 *    trailing `{{2}}` cannot be fixed by swapping it with `{{1}}`.
 *
 * `loyaltyMessageCatalog.test.ts` holds both to every entry.
 */

export type LoyaltyMessageKind = "event" | "keyword";

export type LoyaltyEventGroup = "welcome" | "notification" | "reminder";

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
  /**
   * The template carries a Join quick reply the API adds on save (labelled with the join
   * keyword) and registers whoever taps it — so the body stays editable inline.
   */
  joinButton?: boolean;
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
      // Fires the moment a tier changes, so there is no schedule to set for it: it
      // belongs with the transaction notifications, not on the Reminders page.
      group: "notification",
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
      body: "Hi {{1}}, {{2}} points expire on {{3}}. Use them before then.",
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
    {
      kind: "event",
      eventType: LoyaltyEventType.TIER_AT_RISK,
      group: "reminder",
      label: t("VIP status at risk"),
      description: t("Sent before a member drops out of their tier, while they can still keep it."),
      params: [name, t("tier"), t("days"), t("amount")],
      templateName: "loyalty_tier_at_risk",
      body: "Hi {{1}}, your {{2}} status ends in {{3}} days. Spend {{4}} more to keep it.",
      example: ["Anjali", "Gold", "30", "1200"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.REWARD_EXPIRING,
      group: "reminder",
      label: t("Reward expiring"),
      description: t("Sent before a reward the customer already claimed runs out of time."),
      params: [name, t("reward"), t("date"), t("code")],
      templateName: "loyalty_reward_expiring",
      body: "Hi {{1}}, your {{2}} expires on {{3}}. Show code {{4}} at the counter.",
      example: ["Anjali", "free coffee", "30 Sep", "K4P2"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.SIGNUP_ANNIVERSARY,
      group: "reminder",
      label: t("Joining anniversary"),
      description: t("Sent each year on the day the customer joined."),
      params: [name, t("years"), t("balance")],
      templateName: "loyalty_signup_anniversary",
      body: "Hi {{1}}, it is {{2}} years since you joined us. You have {{3}} points to spend.",
      example: ["Anjali", "1", "1283"],
    },
    {
      kind: "event",
      eventType: LoyaltyEventType.NEW_CUSTOMER_WELCOME,
      group: "welcome",
      label: t("Welcome a new customer"),
      description: t(
        "Sent the first time someone messages you. The Join button signs them up to your program.",
      ),
      params: [name],
      templateName: "loyalty_new_customer_welcome",
      body: "Hi {{1}}, thanks for getting in touch! Join our loyalty program to earn points on every visit. Tap the button below to join.",
      example: ["Anjali"],
      joinButton: true,
    },
  ];
}

/**
 * The six keywords `handleLoyaltyWaCommand` on the API dispatches; a keyword of any other
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
      body: "Your referral code is {{1}}. Share this link with a friend:\n{{2}}\nThanks for spreading the word!",
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
      type: "MemberCard",
      label: t("Getting their card"),
      description: t("Sends their QR card to show at the counter."),
      keyword: "card",
      params: [t("their name"), t("card code")],
      templateName: "loyalty_member_card",
      body: "Hi {{1}}, here is your card. Show this QR at the counter to collect and use your points. Your card code is {{2}} if the camera can't read it.",
      example: ["Anjali", "ABC-DEF-GHJ"],
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

/**
 * Why Meta would refuse this body, or `null` when it would accept it.
 *
 * Both rules are rejections at submit time, not warnings, and the merchant only sees them
 * as a Meta error several minutes later — so the editor asks first.
 *
 * The copy deliberately contains no `{n}`: these strings go through i18next-icu, which
 * reads a brace as the start of a format element.
 */
export function templateBodyProblem(body: string, t: TFunction): string | null {
  const trimmed = body.trim();
  if (/^\{\{\d+\}\}/.test(trimmed) || /\{\{\d+\}\}$/.test(trimmed)) {
    return t(
      "Meta will not accept a message that starts or ends with a variable. Put a word before or after it.",
    );
  }
  const slots = [...trimmed.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]));
  if (slots.some((slot, index) => slot !== index + 1)) {
    return t("Variables have to be used in order, starting from the first one.");
  }
  return null;
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
 * A starter as the WhatsApp template editor's opening state, for a message the merchant
 * has no template for yet.
 *
 * Nothing is stored by opening the editor: the merchant saves it there as a draft or
 * submits it to Meta, exactly as they would for a template that already exists. Creating
 * the draft up front — what the card used to do — wrote a row before anyone had looked at
 * it, and left a second one behind every time the message was opened again.
 */
export function loyaltyStarterValues(
  starter: Pick<LoyaltyMessageDefinition, "templateName" | "body" | "example"> & {
    joinButton?: boolean;
  },
): Partial<TemplateFormValues> {
  return {
    name: starter.templateName,
    header: null,
    language: "en",
    body: starter.body,
    footer: "Powered by rateup.app",
    // UTILITY, not the editor's MARKETING default: these go out on the back of something
    // the customer did, and Meta prices and reviews the two differently.
    category: "UTILITY",
    format: "NONE",
    buttons: starter.joinButton ? [{ type: WHATSAPP_BUTTON_TYPE.QUICK_REPLY, text: "Join" }] : [],
    status: WaTemplateStatus.DRAFT,
    example: [...starter.example],
    templateType: TemplateType.LOYALTY,
  };
}

/** The starter a `?starter=` search param names, if the catalog still has one. */
export function starterByTemplateName(
  catalog: readonly LoyaltyMessageDefinition[],
  templateName: string | undefined,
): LoyaltyMessageDefinition | undefined {
  if (!templateName) return undefined;
  return catalog.find((entry) => entry.templateName === templateName);
}
