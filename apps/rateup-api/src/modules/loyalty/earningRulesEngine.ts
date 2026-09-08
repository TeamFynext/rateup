/**
 * Loyalty Earning Rules Engine
 * Handles calculation of points based on multiple conditional earning rules
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import prisma from "../../utils/prisma.js";
import { randomCode } from "../../utils/misc/random.utils.js";
import type { LoyaltyTier, Prisma } from "../../../generated/prisma/client.js";
import {
  EarningContext,
  PointsCalculationResult,
  LoyaltyEarningRuleConditions,
  DayOfWeek,
} from "../../types/loyalty.js";

dayjs.extend(utc);

type Db = Prisma.TransactionClient | typeof prisma;

export class EarningRulesEngine {
  /**
   * Calculate points for a purchase based on earning rules
   */
  async calculatePointsForPurchase(
    programId: string,
    customerId: string,
    purchaseAmount: number,
    context: EarningContext,
    db: Db = prisma,
  ): Promise<PointsCalculationResult> {
    // 1. Get all active earning rules for the program (ordered by priority DESC)
    const rules = await prisma.loyaltyEarningRule.findMany({
      where: {
        programId,
        status: "active",
      },
      orderBy: {
        priority: "desc",
      },
    });

    // 2. Get customer account (for tier information)
    const customer = await prisma.customerLoyaltyAccount.findUnique({
      where: { id: customerId },
      include: {
        currentTier: true,
        program: { select: { tiersEnabled: true } },
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Turning tiers off has to stop tier earning, not just tier *promotion*. `currentTierId`
    // is left in place when the flag flips (customers keep their standing if it is turned
    // back on), so reading the multiplier unconditionally kept every existing tier member
    // earning at their old rate forever — and made the giveback estimate, which assumes a
    // flat rate when tiers are off, disagree with what was actually awarded.
    const tierMultiplier = customer.program.tiersEnabled
      ? customer.currentTier?.pointsMultiplier || 1.0
      : 1.0;

    // 3. Find the first matching rule
    let matchedRule = null;
    const now = new Date();
    const dayOfWeek = this.getDayOfWeek(now);
    const currentTime = this.getTimeString(now);

    for (const rule of rules) {
      // Check time validity
      if (rule.validFrom && now < new Date(rule.validFrom)) continue;
      if (rule.validUntil && now > new Date(rule.validUntil)) continue;

      // Check day of week
      if (rule.allowedDays && rule.allowedDays.length > 0) {
        if (!rule.allowedDays.includes(dayOfWeek)) continue;
      }

      // Check time ranges
      if (rule.allowedTimeRanges) {
        // Rules are written as a bare array; older rows wrap it under `time_ranges`.
        // Only the wrapped form used to be read, so array-shaped rules skipped the check.
        const stored = rule.allowedTimeRanges;
        const timeRanges = Array.isArray(stored) ? stored : (stored.time_ranges ?? []);
        if (timeRanges.length > 0) {
          const inRange = timeRanges.some((r) => currentTime >= r.start && currentTime <= r.end);
          if (!inRange) continue;
        }
      }

      // Check purchase amount
      if (rule.minPurchaseAmount && purchaseAmount < Number(rule.minPurchaseAmount)) {
        continue;
      }
      if (rule.maxPurchaseAmount && purchaseAmount > Number(rule.maxPurchaseAmount)) {
        continue;
      }

      if (rule.applicableToTiers && rule.applicableToTiers.length > 0) {
        if (!customer.currentTierId || !rule.applicableToTiers.includes(customer.currentTierId)) {
          continue;
        }
      }

      // Check usage limits
      if (rule.maxTotalUses && rule.currentTotalUses >= rule.maxTotalUses) {
        continue;
      }

      if (rule.maxUsesPerCustomer) {
        const customerUses = await prisma.loyaltyTransaction.count({
          where: {
            accountId: customerId,
            earningRuleId: rule.id,
          },
        });
        if (customerUses >= rule.maxUsesPerCustomer) continue;
      }

      // Additional conditions check
      if (rule.conditions && Object.keys(rule.conditions as object).length > 0) {
        if (
          !this.evaluateAdditionalConditions(
            rule.conditions as LoyaltyEarningRuleConditions,
            context,
          )
        ) {
          continue;
        }
      }

      // This rule matches!
      matchedRule = rule;
      break;
    }

    if (!matchedRule) {
      throw new Error("No earning rule found for this program");
    }

    // 5. Calculate points
    const basePoints = purchaseAmount * Number(matchedRule.pointsPerUnit);
    const ruleMultiplied = basePoints * Number(matchedRule.multiplier);
    const bonusAdded = ruleMultiplied + (matchedRule.bonusPoints || 0);
    const finalPoints = Math.floor(bonusAdded * Number(tierMultiplier));

    if (finalPoints > 0) {
      const capped = matchedRule.maxTotalUses
        ? { currentTotalUses: { lt: matchedRule.maxTotalUses } }
        : {};

      const { count } = await db.loyaltyEarningRule.updateMany({
        where: { id: matchedRule.id, ...capped },
        data: {
          currentTotalUses: {
            increment: 1,
          },
        },
      });

      if (count === 0) {
        throw new Error("This earning rule has reached its usage limit");
      }
    }

    return {
      points: finalPoints,
      rule: matchedRule,
      calculation: {
        base_amount: purchaseAmount,
        base_points: basePoints,
        rule_multiplier: Number(matchedRule.multiplier),
        rule_bonus: matchedRule.bonusPoints || 0,
        tier_multiplier: Number(tierMultiplier),
        final_points: finalPoints,
      },
    };
  }

  /**
   * Evaluate additional conditions like location, products, payment method, etc.
   */
  private evaluateAdditionalConditions(
    conditions: LoyaltyEarningRuleConditions,
    context: EarningContext,
  ): boolean {
    // Location check
    if (conditions.locations?.enabled) {
      if (
        !context.location_id ||
        !conditions.locations.location_ids.includes(context.location_id)
      ) {
        return false;
      }
    }

    // Product/Category check
    if (conditions.products?.enabled) {
      const hasAllowedCategory = context.categories?.some((cat) =>
        conditions.products?.categories?.includes(cat),
      );
      const hasAllowedProduct = context.product_skus?.some((sku) =>
        conditions.products?.product_skus?.includes(sku),
      );
      const hasExcludedCategory = context.categories?.some((cat) =>
        conditions.products?.excluded_categories?.includes(cat),
      );

      if (hasExcludedCategory) return false;
      if (conditions.products.categories && !hasAllowedCategory) return false;
      if (conditions.products.product_skus && !hasAllowedProduct) return false;
    }

    // Payment method check
    if (conditions.payment_methods?.enabled) {
      if (
        !context.payment_method ||
        !conditions.payment_methods.allowed_methods.includes(context.payment_method)
      ) {
        return false;
      }
    }

    // Customer type check
    if (conditions.customer_type?.enabled) {
      if (
        !context.customer_type ||
        !conditions.customer_type.types.includes(context.customer_type)
      ) {
        return false;
      }
    }

    // Channel check
    if (conditions.channels?.enabled) {
      if (!context.channel || !conditions.channels.allowed_channels.includes(context.channel)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get day of week in lowercase
   */
  private getDayOfWeek(date: Date): DayOfWeek {
    const days = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return days[date.getUTCDay()];
  }

  /**
   * Get time string in HH:mm format, in UTC
   */
  private getTimeString(date: Date): string {
    return dayjs.utc(date).format("HH:mm");
  }

  /**
   * Check if customer's tier should be upgraded based on total spend.
   *
   * Besides performing the move, reports where the customer now sits and how far the
   * next tier is — the cashier receipt reads "Silver · ₹1,180 to Gold" from this, so no
   * caller has to reload the tier table.
   */
  async checkAndUpgradeTier(customerId: string, totalSpend: number): Promise<TierCheckResult> {
    const customer = await prisma.customerLoyaltyAccount.findUnique({
      where: { id: customerId },
      include: {
        currentTier: true,
        program: {
          include: {
            tiers: {
              orderBy: {
                threshold: "desc",
              },
            },
          },
        },
      },
    });

    if (!customer?.program.tiersEnabled) {
      return {
        upgraded: false,
        direction: "none",
        currentTier: customer?.currentTier ?? null,
        nextTier: null,
        amountToNext: null,
      };
    }

    const tiers = customer.program.tiers;
    // Tiers arrive highest threshold first; the next tier is the lowest one still above
    // the customer's spend.
    const nextTier =
      [...tiers].reverse().find((tier) => Number(tier.threshold) > totalSpend) ?? null;
    const amountToNext = nextTier ? Number(nextTier.threshold) - totalSpend : null;

    // Find the highest tier that the customer qualifies for
    const qualifiedTier = tiers.find((tier) => totalSpend >= Number(tier.threshold));

    if (!qualifiedTier) {
      return {
        upgraded: false,
        direction: "none",
        currentTier: customer.currentTier,
        nextTier,
        amountToNext,
      };
    }

    // Check if it's a different tier
    if (customer.currentTierId === qualifiedTier.id) {
      return {
        upgraded: false,
        direction: "none",
        currentTier: customer.currentTier,
        nextTier,
        amountToNext,
      };
    }

    const direction: TierMoveDirection = !customer.currentTier
      ? "up"
      : Number(qualifiedTier.threshold) > Number(customer.currentTier.threshold)
        ? "up"
        : "down";

    await prisma.customerLoyaltyAccount.update({
      where: { id: customerId },
      data: {
        currentTierId: qualifiedTier.id,
      },
    });

    return {
      upgraded: direction === "up",
      direction,
      newTier: qualifiedTier,
      currentTier: qualifiedTier,
      nextTier,
      amountToNext,
    };
  }

  async generateReferralCode(customerName: string, _customerPhone: string): Promise<string> {
    const namePart = customerName
      ? customerName.substring(0, 6).toUpperCase().replace(/\s/g, "")
      : "USER";

    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const candidate = `${namePart}-${randomCode(10)}`;
      const existing = await prisma.customerLoyaltyAccount.findUnique({
        where: { referralCode: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }

    throw new Error("Could not generate a unique referral code");
  }
}

export type TierMoveDirection = "up" | "down" | "none";

export interface TierCheckResult {
  upgraded: boolean;
  direction: TierMoveDirection;
  /** Set only when the customer actually moved. */
  newTier?: LoyaltyTier;
  /** Where the customer sits after the check. */
  currentTier: LoyaltyTier | null;
  /** The lowest tier still above the customer's spend; null at the top or with tiers off. */
  nextTier: LoyaltyTier | null;
  /** Spend still needed to reach `nextTier`. */
  amountToNext: number | null;
}

/** How many times to redraw a referral code before giving up. */
const CODE_ATTEMPTS = 5;

export const earningRulesEngine = new EarningRulesEngine();

// Export convenience functions for easier imports
export const calculatePointsForPurchase =
  earningRulesEngine.calculatePointsForPurchase.bind(earningRulesEngine);
export const checkAndUpgradeTier = earningRulesEngine.checkAndUpgradeTier.bind(earningRulesEngine);
export const generateReferralCode =
  earningRulesEngine.generateReferralCode.bind(earningRulesEngine);
