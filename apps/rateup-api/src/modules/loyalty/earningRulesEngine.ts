/**
 * Loyalty Earning Rules Engine
 * Handles calculation of points based on multiple conditional earning rules
 */

import prisma from "../../utils/prisma.js";
import {
  EarningContext,
  PointsCalculationResult,
  LoyaltyEarningRuleConditions,
  DayOfWeek,
} from "../../types/loyalty.js";

export class EarningRulesEngine {
  /**
   * Calculate points for a purchase based on earning rules
   */
  async calculatePointsForPurchase(
    programId: string,
    customerId: string,
    purchaseAmount: number,
    context: EarningContext,
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
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    const tierMultiplier = customer.currentTier?.pointsMultiplier || 1.0;

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
        const timeRanges = rule.allowedTimeRanges as any;
        if (timeRanges.time_ranges && Array.isArray(timeRanges.time_ranges)) {
          const inRange = timeRanges.time_ranges.some(
            (r: { start: string; end: string }) =>
              currentTime >= r.start && currentTime <= r.end,
          );
          if (!inRange) continue;
        }
      }

      // Check purchase amount
      if (
        rule.minPurchaseAmount &&
        purchaseAmount < Number(rule.minPurchaseAmount)
      ) {
        continue;
      }
      if (
        rule.maxPurchaseAmount &&
        purchaseAmount > Number(rule.maxPurchaseAmount)
      ) {
        continue;
      }

      // Check tier eligibility
      if (
        rule.applicableToTiers &&
        rule.applicableToTiers.length > 0 &&
        customer.currentTierId
      ) {
        if (!rule.applicableToTiers.includes(customer.currentTierId)) {
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
      if (
        rule.conditions &&
        Object.keys(rule.conditions as object).length > 0
      ) {
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

    // 4. Fallback to default rule if no match
    if (!matchedRule) {
      matchedRule = await prisma.loyaltyEarningRule.findFirst({
        where: {
          programId,
          isDefault: true,
        },
      });
    }

    if (!matchedRule) {
      throw new Error("No earning rule found for this program");
    }

    // 5. Calculate points
    const basePoints = purchaseAmount * Number(matchedRule.pointsPerUnit);
    const ruleMultiplied = basePoints * Number(matchedRule.multiplier);
    const bonusAdded = ruleMultiplied + (matchedRule.bonusPoints || 0);
    const finalPoints = Math.floor(bonusAdded * Number(tierMultiplier));

    // 6. Update rule usage counter
    await prisma.loyaltyEarningRule.update({
      where: { id: matchedRule.id },
      data: {
        currentTotalUses: {
          increment: 1,
        },
      },
    });

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
        !conditions.payment_methods.allowed_methods.includes(
          context.payment_method,
        )
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
      if (
        !context.channel ||
        !conditions.channels.allowed_channels.includes(context.channel)
      ) {
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
    return days[date.getDay()];
  }

  /**
   * Get time string in HH:mm format
   */
  private getTimeString(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  /**
   * Check if customer's tier should be upgraded based on lifetime points
   */
  async checkAndUpgradeTier(
    customerId: string,
    lifetimePoints: number,
  ): Promise<boolean> {
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

    if (!customer || !customer.program.tiersEnabled) {
      return false;
    }

    // Find the highest tier that the customer qualifies for
    const qualifiedTier = customer.program.tiers.find(
      (tier) => lifetimePoints >= tier.threshold,
    );

    if (!qualifiedTier) {
      return false;
    }

    // Check if it's a different tier
    if (customer.currentTierId === qualifiedTier.id) {
      return false;
    }

    // Upgrade the customer
    await prisma.customerLoyaltyAccount.update({
      where: { id: customerId },
      data: {
        currentTierId: qualifiedTier.id,
      },
    });

    return true;
  }

  /**
   * Generate a unique referral code for a customer
   */
  generateReferralCode(customerName: string, customerPhone: string): string {
    const namePart = customerName
      ? customerName.substring(0, 6).toUpperCase().replace(/\s/g, "")
      : "USER";
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${namePart}-${randomPart}`;
  }
}

export const earningRulesEngine = new EarningRulesEngine();

// Export convenience functions for easier imports
export const calculatePointsForPurchase =
  earningRulesEngine.calculatePointsForPurchase.bind(earningRulesEngine);
export const checkAndUpgradeTier =
  earningRulesEngine.checkAndUpgradeTier.bind(earningRulesEngine);
export const generateReferralCode =
  earningRulesEngine.generateReferralCode.bind(earningRulesEngine);
