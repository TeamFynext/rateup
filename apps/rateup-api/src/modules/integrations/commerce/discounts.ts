import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import type { LoyaltyRedemptionRules } from "../../../types/loyalty.js";
import type {
  CommerceDiscountOutcome,
  CommerceDiscountRules,
  CommerceProvider,
} from "./commerce.types.js";
import {
  buildCommerceDiscountInput,
  hasUnsupportedCap,
  parseRewardDiscount,
} from "./discountRules.js";
import { COMMERCE_PROVIDERS } from "./registry.js";

/**
 * Mirrors a loyalty redemption into the merchant's store as a single-use
 * discount code, so the code handed to the customer over WhatsApp is the one
 * they type at checkout.
 *
 * The redemption code is the discount code — one row, one code, one store
 * discount — which is what makes this safe to re-run. Lifted from the Shopify
 * integration; the store-specific half (the API call and its input format) is
 * each provider's `createDiscountCode`.
 */

type Rules = LoyaltyRedemptionRules & Record<string, unknown>;

/**
 * The store whose discount settings the reward opted into, if any. A reward
 * switched on for two stores syncs to the first in `COMMERCE_PROVIDERS` only:
 * one redemption row holds one store discount.
 */
function providerFor(rules: Rules, providers: readonly CommerceProvider[]) {
  return providers.find(
    (provider) => (rules[provider.discountRulesKey] as CommerceDiscountRules | undefined)?.enabled,
  );
}

/**
 * Creates the store discount for one redemption and records it on the row.
 *
 * Never throws: a store that refuses, or has not granted the scope, must not
 * fail the redemption the customer already paid points for. The reason is
 * stored on the redemption so the dashboard can say why the code is
 * cashier-only.
 *
 * Recorded on the redemption's `storeDiscount*` fields.
 */
export async function syncRedemptionDiscount(
  redemptionId: string,
  providers: readonly CommerceProvider[] = COMMERCE_PROVIDERS,
): Promise<CommerceDiscountOutcome> {
  const redemption = await prisma.loyaltyRedemption.findUnique({
    where: { id: redemptionId },
    include: { reward: true, account: { include: { contact: { select: { orgId: true } } } } },
  });

  if (!redemption) return { status: "skipped", reason: "redemption_not_found" };
  if (redemption.storeDiscountId) {
    return {
      status: "skipped",
      reason: "already_synced",
      discountId: redemption.storeDiscountId,
      discountUrl: redemption.storeDiscountUrl ?? undefined,
    };
  }

  const rules = (redemption.reward.redemptionRules ?? {}) as Rules;
  const provider = providerFor(rules, providers);
  if (!provider) return { status: "skipped", reason: "not_enabled" };

  const orgId = redemption.account.contact?.orgId;
  if (!orgId) return { status: "skipped", reason: "no_org" };

  const input = buildCommerceDiscountInput({
    code: redemption.redemptionCode,
    rewardName: redemption.reward.name,
    value: redemption.reward.rewardValue,
    rules,
    storeRules: rules[provider.discountRulesKey] as CommerceDiscountRules | undefined,
    issuedAt: redemption.createdAt,
    expiresAt: redemption.expiresAt,
  });

  if (!input) {
    // Two different refusals, and telling them apart is the point of recording
    // one: a reward that can never sync, versus one whose promotion has ended.
    return await record(redemptionId, {
      status: "skipped",
      reason: parseRewardDiscount(redemption.reward.rewardValue)
        ? "discount_window_already_closed"
        : "reward_value_not_expressible_as_discount",
    });
  }

  if (hasUnsupportedCap(redemption.reward.rewardValue)) {
    log.warn(
      { redemptionId, orgId, rewardId: redemption.rewardId, provider: provider.name },
      `${provider.label} discount synced without its max_discount_amount cap — basic code discounts have no cap field`,
    );
  }

  const outcome = await provider.createDiscountCode(orgId, input);
  // A skip here means the store was never reached (not configured, not
  // connected); there is nothing about this redemption worth recording.
  if (outcome.status === "skipped") return outcome;
  if (outcome.status === "created") {
    log.info(
      { redemptionId, orgId, provider: provider.name, discountId: outcome.discountId },
      `${provider.label} discount created for loyalty redemption`,
    );
  }
  return await record(redemptionId, outcome);
}

/**
 * Turns the code off in the store, for a redemption cancelled or expired
 * before it was used. The store keeps the row so the merchant can still see it.
 */
export async function deactivateRedemptionDiscount(
  redemptionId: string,
  providers: readonly CommerceProvider[] = COMMERCE_PROVIDERS,
): Promise<boolean> {
  const redemption = await prisma.loyaltyRedemption.findUnique({
    where: { id: redemptionId },
    select: {
      storeDiscountId: true,
      reward: { select: { redemptionRules: true } },
      account: { select: { contact: { select: { orgId: true } } } },
    },
  });

  const discountId = redemption?.storeDiscountId;
  const orgId = redemption?.account.contact?.orgId;
  const provider =
    redemption && providerFor((redemption.reward.redemptionRules ?? {}) as Rules, providers);
  if (!discountId || !orgId || !provider) return false;

  return provider.deactivateDiscountCode(orgId, discountId);
}

async function record(
  redemptionId: string,
  outcome: CommerceDiscountOutcome,
): Promise<CommerceDiscountOutcome> {
  await prisma.loyaltyRedemption.update({
    where: { id: redemptionId },
    data: {
      storeDiscountId: outcome.discountId ?? null,
      storeDiscountUrl: outcome.discountUrl ?? null,
      storeDiscountError: outcome.status === "created" ? null : (outcome.reason ?? null),
      storeSyncedAt: new Date(),
    },
  });
  return outcome;
}
