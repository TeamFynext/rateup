import type { TFunction } from "i18next";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";

/**
 * Every WhatsApp message the programme can send, with the template Meta needs to approve
 * for it. Notifications fire off a transaction; reminders run on a schedule.
 */
export interface LoyaltyEventDefinition {
  eventType: LoyaltyEventType;
  group: "notification" | "reminder";
  label: string;
  description: string;
  variables: string;
  /** A ready-to-submit template, when the merchant has none yet. */
  templateName: string;
  body: string;
  example: string[];
}

export function loyaltyEventCatalog(t: TFunction): LoyaltyEventDefinition[] {
  return [
    {
      eventType: LoyaltyEventType.POINTS_ISSUED,
      group: "notification",
      label: t("When points are earned"),
      description: t("Sent after every purchase that earns points."),
      variables: `{{1}} ${t("name")} · {{2}} ${t("points")} · {{3}} ${t("balance")}`,
      templateName: "loyalty_points_issued",
      body: "Hi {{1}}, you just earned {{2}} points. Your balance is now {{3}}.",
      example: ["Anjali", "43", "1283"],
    },
    {
      eventType: LoyaltyEventType.POINTS_ADJUSTED,
      group: "notification",
      label: t("When points are adjusted"),
      description: t("Sent when staff correct a balance and the change is approved."),
      variables: `{{1}} ${t("name")} · {{2}} ${t("change")} · {{3}} ${t("balance")}`,
      templateName: "loyalty_points_adjusted",
      body: "Hi {{1}}, your points were adjusted by {{2}}. Your balance is now {{3}}.",
      example: ["Anjali", "-24", "1259"],
    },
    {
      eventType: LoyaltyEventType.REWARD_ISSUED,
      group: "notification",
      label: t("When a gift is given"),
      description: t("Sent when staff hand a customer a free gift with a code."),
      variables: `{{1}} ${t("name")} · {{2}} ${t("reward")} · {{3}} ${t("code")} · {{4}} ${t("cost")}`,
      templateName: "loyalty_reward_issued",
      body: "Hi {{1}}, you have a gift waiting: {{2}}. Show code {{3}} at the counter.",
      example: ["Anjali", "Birthday brownie", "KC-4471", "0"],
    },
    {
      eventType: LoyaltyEventType.REWARD_REDEEMED,
      group: "notification",
      label: t("When a reward is redeemed"),
      description: t("Sent when a customer spends points on a reward."),
      variables: `{{1}} ${t("name")} · {{2}} ${t("reward")} · {{3}} ${t("code")} · {{4}} ${t("points used")}`,
      templateName: "loyalty_reward_redeemed",
      body: "Hi {{1}}, your reward {{2}} is confirmed. Show code {{3}} to redeem it ({{4}} points used).",
      example: ["Anjali", "Free regular hot drink", "KC-4471", "500"],
    },
    {
      eventType: LoyaltyEventType.TIER_UPGRADED,
      group: "reminder",
      label: t("Tier upgrade"),
      description: t("Sent the moment someone reaches a new tier."),
      variables: `{{1}} ${t("name")} · {{2}} ${t("tier")}`,
      templateName: "loyalty_tier_upgraded",
      body: "Congratulations {{1}} — you are now {{2}} and earn faster from today.",
      example: ["Anjali", "Gold"],
    },
    {
      eventType: LoyaltyEventType.BIRTHDAY,
      group: "reminder",
      label: t("Birthday gift"),
      description: t("Sent on the customer's birthday, with the gift you pick."),
      variables: `{{1}} ${t("name")} · {{2}} ${t("gift")}`,
      templateName: "loyalty_birthday",
      body: "Happy birthday {{1}}! A {{2}} is waiting for you this week.",
      example: ["Anjali", "brownie"],
    },
    {
      eventType: LoyaltyEventType.INACTIVITY_REMINDER,
      group: "reminder",
      label: t("Inactivity reminder"),
      description: t("Sent after a quiet spell, to bring a customer back."),
      variables: `{{1}} ${t("name")} · {{2}} ${t("balance")}`,
      templateName: "loyalty_inactivity_reminder",
      body: "We miss you {{1}}. You still have {{2}} points waiting.",
      example: ["Anjali", "1283"],
    },
    {
      eventType: LoyaltyEventType.POINTS_EXPIRY_ALERT,
      group: "reminder",
      label: t("Points expiry warning"),
      description: t("Sent before points expire, if expiry is on in Settings."),
      variables: `{{1}} ${t("name")} · {{2}} ${t("points")} · {{3}} ${t("date")}`,
      templateName: "loyalty_points_expiry_alert",
      body: "{{1}}, {{2}} points expire on {{3}}. Use them before then.",
      example: ["Anjali", "300", "30 Sep"],
    },
    {
      eventType: LoyaltyEventType.POINTS_EXPIRED,
      group: "reminder",
      label: t("Points expired"),
      description: t("Sent once points have expired."),
      variables: `{{1}} ${t("name")} · {{2}} ${t("points")}`,
      templateName: "loyalty_points_expired",
      body: "Hi {{1}}, {{2}} points expired today.",
      example: ["Anjali", "300"],
    },
  ];
}
