import type { ShopifyDiscountRules } from "@/backend/loyalty/reward.api";

/** The two Shopify fields the point-reward and coupon forms both carry. */
export interface ShopifyFormFields {
  shopifyDiscountEnabled?: boolean;
  shopifyValidForDays?: number;
}

/**
 * `redemptionRules.shopify` is what makes each of this reward's redemption codes a real
 * discount code in the merchant's store — `shopifyDiscount.service.ts` reads it server-side.
 *
 * Written as `{ enabled: false }` rather than omitted when the switch is off, so turning it
 * off on an existing reward actually clears it. An omitted key would leave the rule already
 * stored on the row untouched and the reward would keep syncing.
 */
export function shopifyRulesFrom(data: ShopifyFormFields): ShopifyDiscountRules {
  if (!data.shopifyDiscountEnabled) return { enabled: false };
  return {
    enabled: true,
    ...(data.shopifyValidForDays ? { valid_for_days: data.shopifyValidForDays } : {}),
  };
}

/** The same rules back as form values, for the edit screen. */
export function shopifyRulesToForm(rules: ShopifyDiscountRules | undefined): ShopifyFormFields {
  return {
    shopifyDiscountEnabled: !!rules?.enabled,
    shopifyValidForDays: rules?.valid_for_days || undefined,
  };
}
