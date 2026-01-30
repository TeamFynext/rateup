/**
 * Loyalty Redemption Validator
 * Validates reward redemptions against complex rule sets
 */

import prisma from "../../utils/prisma.js";
import {
  RedemptionValidationResult,
  LoyaltyRedemptionRules,
  LoyaltyRedemptionContext,
  DayOfWeek,
} from "../../types/loyalty.js";

export class RedemptionValidator {
  /**
   * Validate if a customer can redeem a specific reward
   */
  async validateRedemption(
    customerId: string,
    rewardId: string,
    context: LoyaltyRedemptionContext,
  ): Promise<RedemptionValidationResult> {
    const reward = await prisma.loyaltyReward.findUnique({
      where: { id: rewardId },
    });
    const violations: string[] = [];

    if (!reward) {
      return {
        valid: false,
        violations: ["Reward not found"],
        reward: null,
        customer: null,
      };
    }

    const customer = await prisma.customerLoyaltyAccount.findUnique({
      where: { id: customerId },
      include: {
        currentTier: true,
      },
    });

    if (!customer) {
      return {
        valid: false,
        violations: ["Customer not found"],
        reward: null,
        customer: null,
      };
    }

    // Check if reward type is 'assigned' and if it is assigned to the customer
    if (reward.rewardType === "assigned") {
      const assignment = await (prisma as any).customerReward.findUnique({
        where: {
          rewardId_accountId: {
            rewardId: reward.id,
            accountId: customer.id,
          },
        },
      });

      if (!assignment) {
        violations.push("Reward is not assigned to the customer");
      }
    }

    const rules = reward.redemptionRules as LoyaltyRedemptionRules;

    // 1. Check points balance
    if (customer.currentPoints < reward.pointsCost) {
      violations.push(
        `Not enough points. Need ${reward.pointsCost}, have ${customer.currentPoints}`,
      );
    }

    // 2. Time restrictions
    if (rules.time_restrictions?.enabled) {
      const timeViolations = await this.validateTimeRestrictions(
        rules.time_restrictions,
        customerId,
        rewardId,
      );
      violations.push(...timeViolations);
    }

    // 3. Quantity restrictions
    if (rules.quantity_restrictions) {
      const quantityViolations = await this.validateQuantityRestrictions(
        rules.quantity_restrictions,
        customerId,
        rewardId,
      );
      violations.push(...quantityViolations);
    }

    // 4. Cooldown
    if (rules.cooldown?.enabled) {
      const cooldownViolation = await this.validateCooldown(
        rules.cooldown.period_hours!,
        customerId,
        rewardId,
      );
      if (cooldownViolation) violations.push(cooldownViolation);
    }

    // 5. Spend requirements
    if (rules.spend_requirements?.enabled && context.purchase_amount) {
      const spendViolation = this.validateSpendRequirements(
        rules.spend_requirements,
        context.purchase_amount,
      );
      if (spendViolation) violations.push(spendViolation);
    }

    // 6. Tier restrictions
    if (rules.tier_restrictions?.enabled) {
      const tierViolation = this.validateTierRestrictions(
        rules.tier_restrictions,
        customer.currentTierId,
      );
      if (tierViolation) violations.push(tierViolation);
    }

    // 7. Stock check
    if (rules.inventory?.enabled) {
      const stockViolation = this.validateStock(reward);
      if (stockViolation) violations.push(stockViolation);
    }

    return {
      valid: violations.length === 0,
      violations,
      reward,
      customer,
    };
  }

  /**
   * Validate time restrictions
   */
  private async validateTimeRestrictions(
    restrictions: any,
    customerId: string,
    rewardId: string,
  ): Promise<string[]> {
    const violations: string[] = [];
    const now = new Date();

    // Check validity period
    if (restrictions.valid_from && now < new Date(restrictions.valid_from)) {
      violations.push("This reward is not yet available");
    }
    if (restrictions.valid_until && now > new Date(restrictions.valid_until)) {
      violations.push("This reward has expired");
    }

    // Check allowed days
    if (restrictions.allowed_days && restrictions.allowed_days.length > 0) {
      const dayOfWeek = this.getDayOfWeek(now);
      if (!restrictions.allowed_days.includes(dayOfWeek)) {
        violations.push(
          `Only available on: ${restrictions.allowed_days.join(", ")}`,
        );
      }
    }

    // Check time ranges
    if (
      restrictions.allowed_time_ranges &&
      restrictions.allowed_time_ranges.length > 0
    ) {
      const currentTime = this.getTimeString(now);
      const inValidRange = restrictions.allowed_time_ranges.some(
        (range: { start: string; end: string }) =>
          currentTime >= range.start && currentTime <= range.end,
      );
      if (!inValidRange) {
        violations.push("Only available during specified hours");
      }
    }

    // Check blackout dates
    if (restrictions.blackout_dates && restrictions.blackout_dates.length > 0) {
      const todayDate = now.toISOString().split("T")[0];
      if (restrictions.blackout_dates.includes(todayDate)) {
        violations.push("Not available on this date");
      }
    }

    return violations;
  }

  /**
   * Validate quantity restrictions
   */
  private async validateQuantityRestrictions(
    restrictions: any,
    customerId: string,
    rewardId: string,
  ): Promise<string[]> {
    const violations: string[] = [];

    // One-time use check
    if (restrictions.one_time_use) {
      const previousUse = await prisma.loyaltyRedemption.findFirst({
        where: {
          accountId: customerId,
          rewardId,
          status: "USED",
        },
      });
      if (previousUse) {
        violations.push("This reward can only be used once");
      }
    }

    // Max redemptions per customer
    if (restrictions.max_redemptions_per_customer) {
      const totalRedemptions = await prisma.loyaltyRedemption.count({
        where: {
          accountId: customerId,
          rewardId,
          status: "USED",
        },
      });
      if (totalRedemptions >= restrictions.max_redemptions_per_customer) {
        violations.push("Maximum redemption limit reached for this reward");
      }
    }

    // Max redemptions per day
    if (restrictions.max_redemptions_per_day) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRedemptions = await prisma.loyaltyRedemption.count({
        where: {
          accountId: customerId,
          rewardId,
          usedAt: {
            gte: today,
          },
        },
      });
      if (todayRedemptions >= restrictions.max_redemptions_per_day) {
        violations.push("Daily redemption limit reached");
      }
    }

    // Max redemptions per week
    if (restrictions.max_redemptions_per_week) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekRedemptions = await prisma.loyaltyRedemption.count({
        where: {
          accountId: customerId,
          rewardId,
          usedAt: {
            gte: weekAgo,
          },
        },
      });
      if (weekRedemptions >= restrictions.max_redemptions_per_week) {
        violations.push("Weekly redemption limit reached");
      }
    }

    // Max redemptions per month
    if (restrictions.max_redemptions_per_month) {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthRedemptions = await prisma.loyaltyRedemption.count({
        where: {
          accountId: customerId,
          rewardId,
          usedAt: {
            gte: monthAgo,
          },
        },
      });
      if (monthRedemptions >= restrictions.max_redemptions_per_month) {
        violations.push("Monthly redemption limit reached");
      }
    }

    return violations;
  }

  /**
   * Validate cooldown period
   */
  private async validateCooldown(
    periodHours: number,
    customerId: string,
    rewardId: string,
  ): Promise<string | null> {
    const lastRedemption = await prisma.loyaltyRedemption.findFirst({
      where: {
        accountId: customerId,
        rewardId,
        status: "USED",
      },
      orderBy: {
        usedAt: "desc",
      },
    });

    if (lastRedemption?.usedAt) {
      const hoursSince =
        (Date.now() - new Date(lastRedemption.usedAt).getTime()) /
        (1000 * 60 * 60);
      if (hoursSince < periodHours) {
        return `Please wait ${Math.ceil(periodHours - hoursSince)} hours`;
      }
    }

    return null;
  }

  /**
   * Validate spend requirements
   */
  private validateSpendRequirements(
    requirements: any,
    purchaseAmount: number,
  ): string | null {
    if (
      requirements.minimum_spend &&
      purchaseAmount < requirements.minimum_spend
    ) {
      return `Minimum spend of ${requirements.minimum_spend} required`;
    }
    return null;
  }

  /**
   * Validate tier restrictions
   */
  private validateTierRestrictions(
    restrictions: any,
    customerTierId: string | null,
  ): string | null {
    if (
      restrictions.allowed_tiers &&
      restrictions.allowed_tiers.length > 0 &&
      customerTierId
    ) {
      if (!restrictions.allowed_tiers.includes(customerTierId)) {
        return "Your tier does not have access to this reward";
      }
    }
    return null;
  }

  /**
   * Validate stock availability
   */
  private validateStock(reward: any): string | null {
    if (
      reward.stockQuantity !== null &&
      reward.stockRedeemed >= reward.stockQuantity
    ) {
      return "This reward is out of stock";
    }
    return null;
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
   * Generate a unique redemption code
   */
  generateRedemptionCode(): string {
    const prefix = "RU";
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${randomPart}`;
  }
}

export const redemptionValidator = new RedemptionValidator();

// Export convenience functions for easier imports
export const validateRedemption =
  redemptionValidator.validateRedemption.bind(redemptionValidator);
export const generateRedemptionCode =
  redemptionValidator.generateRedemptionCode.bind(redemptionValidator);
