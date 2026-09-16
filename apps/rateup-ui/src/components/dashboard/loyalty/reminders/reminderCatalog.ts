import type { TFunction } from "i18next";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";

/**
 * The occasions the Reminders page configures, and which timing control each one needs.
 *
 * Every loyalty event with a schedule to set lives here. The four that shipped before —
 * birthday, a quiet member, points expiring, points expired — plus VIP at risk, a reward
 * about to lapse, and the joining anniversary.
 *
 * `TIER_UPGRADED` is deliberately absent even though the message catalog groups it as a
 * reminder: it fires the moment a tier changes, so there is no *when* to choose. It stays
 * with the transaction notifications on Messages › Automatic.
 *
 * What each occasion *says* is not here either. One message, one place to write it —
 * `loyaltyMessageCatalog` owns the wording for all of them, whichever page schedules it.
 */

/** The timing control an occasion needs, beyond the send hour every one of them has. */
export type ReminderTiming =
  /** Days ahead of a dated occasion: before expiry, before a lapse, before a window closes. */
  | "leadDays"
  /** Quiet days before a nudge. */
  | "quietDays"
  /** Lands on the day itself; nothing to choose. */
  | "onTheDay";

export interface ReminderDefinition {
  eventType: LoyaltyEventType;
  /** What the merchant is setting up, in their words. */
  label: string;
  /** One line on when it goes out. */
  timingHint: string;
  timing: ReminderTiming;
  /** The label beside the number input, when there is one. */
  daysLabel?: string;
  /** Whether the occasion can carry a gift. */
  canGift: boolean;
  /** Sensible starting value for the number input. */
  defaultDays?: number;
  /** Something the merchant must switch on elsewhere for this to fire at all. */
  requires?: string;
}

export function reminderCatalog(t: TFunction): ReminderDefinition[] {
  return [
    {
      eventType: LoyaltyEventType.BIRTHDAY,
      label: t("Birthday"),
      timingHint: t("On the customer's birthday."),
      timing: "onTheDay",
      canGift: true,
    },
    {
      eventType: LoyaltyEventType.SIGNUP_ANNIVERSARY,
      label: t("Joining anniversary"),
      timingHint: t("Each year on the day they joined."),
      timing: "onTheDay",
      canGift: true,
    },
    {
      eventType: LoyaltyEventType.INACTIVITY_REMINDER,
      label: t("Quiet for a while"),
      timingHint: t("Once a customer has not visited for a stretch. Sent once per lapse."),
      timing: "quietDays",
      daysLabel: t("After this many quiet days"),
      defaultDays: 30,
      canGift: true,
    },
    {
      eventType: LoyaltyEventType.TIER_AT_RISK,
      label: t("VIP status at risk"),
      timingHint: t("Before a member drops out of their tier, while they can still keep it."),
      timing: "leadDays",
      daysLabel: t("Days before they lose it"),
      defaultDays: 30,
      canGift: false,
      requires: t("Needs a tier window, set on the Program page."),
    },
    {
      eventType: LoyaltyEventType.REWARD_EXPIRING,
      label: t("Reward expiring"),
      timingHint: t("Before a reward they already claimed runs out of time."),
      timing: "leadDays",
      daysLabel: t("Days before it lapses"),
      defaultDays: 3,
      canGift: false,
    },
    {
      eventType: LoyaltyEventType.POINTS_EXPIRY_ALERT,
      label: t("Points expiring"),
      timingHint: t("Before a customer's points run out."),
      timing: "leadDays",
      daysLabel: t("Days before they expire"),
      defaultDays: 14,
      canGift: false,
      requires: t("Needs points expiry, switched on in Settings."),
    },
    {
      eventType: LoyaltyEventType.POINTS_EXPIRED,
      label: t("Points expired"),
      timingHint: t("Once points have gone, so the balance is never a surprise."),
      timing: "onTheDay",
      canGift: false,
      requires: t("Needs points expiry, switched on in Settings."),
    },
  ];
}

/**
 * The hours a reminder may be sent at, as select options in the programme's own time.
 *
 * Not routed through `t()`: a clock face is digits, not prose, and a key containing a colon
 * collides with i18next's namespace separator — `t("{hour}:00")` is read as key `00` in a
 * namespace called `{hour}`, which is how every option came out reading "00".
 *
 * 24-hour, deliberately: staff read a clock, and "13:00" cannot be misread as 1am the way
 * "1:00" can.
 */
export function sendHourOptions(): { value: string; label: string }[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    value: String(hour),
    label: `${String(hour).padStart(2, "0")}:00`,
  }));
}

/** The default hour the API applies when a programme has not chosen one. */
export const DEFAULT_SEND_HOUR = 10;
