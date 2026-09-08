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
};

/**
 * `loyalty_points_issued` → `loyalty_points_issued_v2`, `_v3`, … An edit Meta will not
 * take in place (the template is mid-review) becomes a new template under the next free
 * suffix, and the base name stays recognisable in the library.
 */
export function versionedTemplateName(baseName: string, version: number): string {
  return version <= 1 ? baseName : `${baseName}_v${version}`;
}
