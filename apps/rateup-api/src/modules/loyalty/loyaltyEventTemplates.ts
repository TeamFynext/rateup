import { LoyaltyEventType } from "../../types/enums.js";

/**
 * The Meta template name each loyalty event submits under. Names are unique per WhatsApp
 * account, so this is also what makes re-submission idempotent: the onboarding wizard and
 * the Messages page both look a template up by this name before creating one.
 *
 * The UI's message catalog mirrors this list; keep the two in step.
 */
export const LOYALTY_EVENT_TEMPLATE_NAMES: Record<LoyaltyEventType, string> = {
  [LoyaltyEventType.POINTS_ISSUED]: "loyalty_points_issued",
  [LoyaltyEventType.POINTS_ADJUSTED]: "loyalty_points_adjusted",
  [LoyaltyEventType.REWARD_ISSUED]: "loyalty_reward_issued",
  [LoyaltyEventType.REWARD_REDEEMED]: "loyalty_reward_redeemed",
  [LoyaltyEventType.TIER_UPGRADED]: "loyalty_tier_upgraded",
  [LoyaltyEventType.BIRTHDAY]: "loyalty_birthday",
  [LoyaltyEventType.INACTIVITY_REMINDER]: "loyalty_inactivity_reminder",
  [LoyaltyEventType.POINTS_EXPIRY_ALERT]: "loyalty_points_expiry_alert",
  [LoyaltyEventType.POINTS_EXPIRED]: "loyalty_points_expired",
  [LoyaltyEventType.TIER_AT_RISK]: "loyalty_tier_at_risk",
  [LoyaltyEventType.REWARD_EXPIRING]: "loyalty_reward_expiring",
  [LoyaltyEventType.SIGNUP_ANNIVERSARY]: "loyalty_signup_anniversary",
  [LoyaltyEventType.NEW_CUSTOMER_WELCOME]: "loyalty_new_customer_welcome",
};

/**
 * The quick-reply payload the welcome's Join button is sent with. A tap registers the
 * customer whatever the button says, so renaming the join keyword cannot strand it.
 */
export const LOYALTY_JOIN_PAYLOAD = "LOYALTY_JOIN";

/**
 * Whether a message is a tap on the Join button. A template's quick reply arrives as
 * `buttonPayload`; the interactive button sent inside an open window, as `buttonId`.
 */
export function isJoinTap(parsed: { buttonPayload?: string; buttonId?: string }): boolean {
  return parsed.buttonPayload === LOYALTY_JOIN_PAYLOAD || parsed.buttonId === LOYALTY_JOIN_PAYLOAD;
}

/** Meta's limit on a quick-reply button's label. */
const QUICK_REPLY_MAX_LENGTH = 25;

/** "join" → "Join": the org's join keyword as a button label. */
export function joinButtonLabel(joinKeyword: string | null | undefined): string {
  const word = joinKeyword?.trim() || "join";
  return (word.charAt(0).toUpperCase() + word.slice(1)).slice(0, QUICK_REPLY_MAX_LENGTH);
}

/**
 * `loyalty_points_issued` → `loyalty_points_issued_v2`, `_v3`, … An edit Meta will not
 * take in place (the template is mid-review) becomes a new template under the next free
 * suffix, and the base name stays recognisable in the library.
 */
export function versionedTemplateName(baseName: string, version: number): string {
  return version <= 1 ? baseName : `${baseName}_v${version}`;
}
