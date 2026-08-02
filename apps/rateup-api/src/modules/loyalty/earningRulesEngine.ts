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

/**
 * Either the prisma client or a transaction client. The usage counter is written
 * through whichever one the caller passes, so awardPoints can enrol it in the same
 * transaction as the points and the ledger row. See issues.txt 20.10.
 */
type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Every clock in this file is UTC, for the same reason as redemptionValidator.ts:
 * `getDay()` and `toTimeString()` used to read the deployment's local timezone, so
 * a rule written as "Tuesdays, 09:00-17:00" followed the server's clock rather
 * than the merchant's and produced different answers if the API moved region.
 * See issues.txt 20.2.
 */
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

      // Check tier eligibility.
      //
      // The `&& customer.currentTierId` that used to close this condition meant an
      // untiered customer skipped the comparison and so matched every
      // tier-exclusive rule, including the platinum ones. New accounts were
      // created untiered whenever the entry-tier lookup missed, which it did for
      // every single-tier program (issues.txt 20.11). A null tier is not in any
      // list. See issues.txt 20.6.
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

    // 4. There is no separate fallback query any more.
    //
    // There used to be one: `findFirst({ where: { programId, isDefault: true } })`
    // — no status, no validity window, no tier list, no usage caps. It ran
    // whenever the loop above found nothing, which meant a default rule that an
    // operator had deliberately deactivated, or whose validity window had passed,
    // or whose own maxTotalUses was exhausted, still priced every purchase that no
    // other rule matched.
    //
    // It was also redundant. The default rule is an ordinary row in `rules`, so if
    // it is active and eligible the loop has already matched it — the fallback
    // could only ever fire for a default rule that had just been REJECTED, and
    // then ignore the reason. A program whose only rule is switched off now says
    // so instead of quietly pricing at the switched-off rate.
    // See issues.txt 20.10.
    if (!matchedRule) {
      throw new Error("No earning rule found for this program");
    }

    // 5. Calculate points
    const basePoints = purchaseAmount * Number(matchedRule.pointsPerUnit);
    const ruleMultiplied = basePoints * Number(matchedRule.multiplier);
    const bonusAdded = ruleMultiplied + (matchedRule.bonusPoints || 0);
    const finalPoints = Math.floor(bonusAdded * Number(tierMultiplier));

    // 6. Count the use — conditionally, and through the caller's client.
    //
    // This used to be an unconditional `update` on the global prisma client, run
    // before the caller had written the points or the ledger row and outside any
    // transaction. Three things followed: the counter was burned for purchases
    // that failed afterwards, it was burned for purchases that earned nothing, and
    // two concurrent purchases both saw the pre-increment value — so a promotion
    // limited to N uses could exceed N.
    //
    // `db` is the caller's transaction when there is one, so the count rolls back
    // with everything else. The `currentTotalUses` filter makes the cap part of
    // the write's own condition rather than a read taken at the top of this
    // function. See issues.txt 20.10.
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
   * Check if customer's tier should be upgraded based on total spend
   */
  async checkAndUpgradeTier(
    customerId: string,
    totalSpend: number,
  ): Promise<{ upgraded: boolean; direction: TierMoveDirection; newTier?: LoyaltyTier }> {
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
      return { upgraded: false, direction: "none" };
    }

    // Find the highest tier that the customer qualifies for
    const qualifiedTier = customer.program.tiers.find(
      (tier) => totalSpend >= Number(tier.threshold),
    );

    if (!qualifiedTier) {
      return { upgraded: false, direction: "none" };
    }

    // Check if it's a different tier
    if (customer.currentTierId === qualifiedTier.id) {
      return { upgraded: false, direction: "none" };
    }

    // Which way the customer is moving.
    //
    // This function writes whichever tier the supplied spend qualifies for, in
    // EITHER direction — which is what a tier reset needs — but it used to report
    // every one of those moves as `{ upgraded: true }`, and awardPoints uses that
    // flag to send a TIER_UPGRADED WhatsApp message naming the new tier. Any
    // caller passing something other than a rising lifetime spend therefore moved
    // customers down and congratulated them for it. The move and the direction are
    // separate answers now, and only a genuine promotion is an upgrade.
    // See issues.txt 20.12.
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

    return { upgraded: direction === "up", direction, newTier: qualifiedTier };
  }

  /**
   * Generate a referral code that is not already in use.
   *
   * A referral code earns its owner points on every signup that quotes it, and the
   * public enrolment route accepts one without a session (issues.txt 20.13) — so
   * it is a credential, not a label.
   *
   * It used to be the first six letters of the CUSTOMER'S OWN NAME plus four
   * Math.random characters, never checked against the table: derived from
   * something an attacker can read off the customer, and with a search space of
   * about 1.6 million per known name. The two findings composed into a
   * points-minting loop. The name part stays because customers read these codes
   * out and recognise their own, but the entropy no longer depends on it — ten
   * characters from a 32-symbol alphabet is 50 bits after the dash.
   * See issues.txt 20.9.
   */
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

/** Which way a tier move went. See issues.txt 20.12. */
export type TierMoveDirection = "up" | "down" | "none";

/** How many times to redraw a referral code before giving up. */
const CODE_ATTEMPTS = 5;

export const earningRulesEngine = new EarningRulesEngine();

// Export convenience functions for easier imports
export const calculatePointsForPurchase =
  earningRulesEngine.calculatePointsForPurchase.bind(earningRulesEngine);
export const checkAndUpgradeTier = earningRulesEngine.checkAndUpgradeTier.bind(earningRulesEngine);
export const generateReferralCode =
  earningRulesEngine.generateReferralCode.bind(earningRulesEngine);
