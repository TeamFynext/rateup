/**
 * Loyalty Redemption Validator
 * Validates reward redemptions against complex rule sets
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import prisma from "../../utils/prisma.js";
import { randomCode } from "../../utils/misc/random.utils.js";
import type { LoyaltyReward } from "../../../generated/prisma/client.js";
import {
  RedemptionValidationResult,
  LoyaltyRedemptionRules,
  TimeRestrictions,
  QuantityRestrictions,
  SpendRequirements,
  TierRestrictions,
  LoyaltyRedemptionContext,
  DayOfWeek,
  ASSIGNMENT_ONLY_REWARD_TYPES,
} from "../../types/loyalty.js";

dayjs.extend(utc);

/** How many times to redraw a code before giving up on finding a free one. */
const CODE_ATTEMPTS = 5;

export class RedemptionValidator {
  /**
   * Validate if a customer can redeem a specific reward
   */
  async validateRedemption(
    customerId: string,
    rewardId: string,
    context: LoyaltyRedemptionContext,
  ): Promise<RedemptionValidationResult> {
    const violations: string[] = [];

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

    const reward = await prisma.loyaltyReward.findFirst({
      where: { id: rewardId, programId: customer.programId },
    });

    if (!reward) {
      return {
        valid: false,
        violations: ["Reward not found"],
        reward: null,
        customer: null,
      };
    }

    // Assigned and review rewards cannot be bought: they have to be on the account already
    if (ASSIGNMENT_ONLY_REWARD_TYPES.includes(reward.rewardType)) {
      const assignment = await prisma.customerReward.findUnique({
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

    const rules = (reward.redemptionRules ?? {}) as LoyaltyRedemptionRules;

    // 1. Check points balance (skip for rewards that are issued rather than bought)
    if (
      !ASSIGNMENT_ONLY_REWARD_TYPES.includes(reward.rewardType) &&
      customer.currentPoints < reward.pointsCost
    ) {
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
        rules.cooldown.period_hours,
        customerId,
        rewardId,
      );
      if (cooldownViolation) violations.push(cooldownViolation);
    }

    if (rules.spend_requirements?.enabled) {
      const spendViolation = this.validateSpendRequirements(
        rules.spend_requirements,
        context.purchase_amount ?? 0,
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

    const stockViolation = this.validateStock(reward);
    if (stockViolation) violations.push(stockViolation);

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
    restrictions: TimeRestrictions,
    _customerId: string,
    _rewardId: string,
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
        violations.push(`Only available on: ${restrictions.allowed_days.join(", ")}`);
      }
    }

    // Check time ranges
    if (restrictions.allowed_time_ranges && restrictions.allowed_time_ranges.length > 0) {
      const currentTime = this.getTimeString(now);
      const inValidRange = restrictions.allowed_time_ranges.some(
        (range: { start: string; end: string }) =>
          currentTime >= range.start && currentTime <= range.end,
      );
      if (!inValidRange) {
        violations.push("Only available during specified hours");
      }
    }

    // Check blackout dates — UTC, like the day and hour checks above it
    if (restrictions.blackout_dates && restrictions.blackout_dates.length > 0) {
      const todayDate = dayjs.utc(now).format("YYYY-MM-DD");
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
    restrictions: QuantityRestrictions,
    customerId: string,
    rewardId: string,
  ): Promise<string[]> {
    const violations: string[] = [];

    // One-time use check - count any active redemption (APPROVED, PENDING, USED)
    if (restrictions.one_time_use) {
      const previousUse = await prisma.loyaltyRedemption.findFirst({
        where: {
          accountId: customerId,
          rewardId,
          status: {
            in: ["APPROVED", "PENDING", "USED"],
          },
        },
      });
      if (previousUse) {
        violations.push("This reward can only be used once");
      }
    }

    // Max redemptions per customer - count all active redemptions
    if (restrictions.max_redemptions_per_customer) {
      const totalRedemptions = await prisma.loyaltyRedemption.count({
        where: {
          accountId: customerId,
          rewardId,
          status: {
            in: ["APPROVED", "PENDING", "USED"],
          },
        },
      });
      if (totalRedemptions >= restrictions.max_redemptions_per_customer) {
        violations.push("Maximum redemption limit reached for this reward");
      }
    }

    const windows: Array<[number | undefined, dayjs.OpUnitType, string]> = [
      [restrictions.max_redemptions_per_day, "day", "Daily redemption limit reached"],
      [restrictions.max_redemptions_per_week, "week", "Weekly redemption limit reached"],
      [restrictions.max_redemptions_per_month, "month", "Monthly redemption limit reached"],
    ];

    for (const [max, unit, message] of windows) {
      if (!max) continue;

      const used = await prisma.loyaltyRedemption.count({
        where: {
          accountId: customerId,
          rewardId,
          status: {
            in: ["APPROVED", "PENDING", "USED"],
          },
          createdAt: {
            gte: dayjs.utc().startOf(unit).toDate(),
          },
        },
      });
      if (used >= max) {
        violations.push(message);
      }
    }

    return violations;
  }

  /**
   * Validate cooldown period
   */
  private async validateCooldown(
    periodHours: number | undefined,
    customerId: string,
    rewardId: string,
  ): Promise<string | null> {
    if (!periodHours || periodHours <= 0) {
      return "This reward's cooldown is not configured correctly";
    }

    const lastRedemption = await prisma.loyaltyRedemption.findFirst({
      where: {
        accountId: customerId,
        rewardId,
        status: {
          in: ["APPROVED", "PENDING", "USED"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (lastRedemption?.createdAt) {
      const hoursSince =
        (Date.now() - new Date(lastRedemption.createdAt).getTime()) / (1000 * 60 * 60);
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
    requirements: SpendRequirements,
    purchaseAmount: number,
  ): string | null {
    if (requirements.minimum_spend && purchaseAmount < requirements.minimum_spend) {
      return `Minimum spend of ${requirements.minimum_spend} required`;
    }
    return null;
  }

  /**
   * Validate tier restrictions
   */
  private validateTierRestrictions(
    restrictions: TierRestrictions,
    customerTierId: string | null,
  ): string | null {
    if (restrictions.allowed_tiers && restrictions.allowed_tiers.length > 0) {
      if (!customerTierId || !restrictions.allowed_tiers.includes(customerTierId)) {
        return "Your tier does not have access to this reward";
      }
    }
    return null;
  }

  /**
   * Validate stock availability
   */
  private validateStock(
    reward: Pick<LoyaltyReward, "stockQuantity" | "stockRedeemed">,
  ): string | null {
    if (reward.stockQuantity !== null && reward.stockRedeemed >= reward.stockQuantity) {
      return "This reward is out of stock";
    }
    return null;
  }

  /**
   * Get day of week in lowercase, in UTC
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

  async generateRedemptionCode(): Promise<string> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const candidate = `RU-${randomCode(10)}`;
      const existing = await prisma.loyaltyRedemption.findUnique({
        where: { redemptionCode: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }
    throw new Error("Could not generate a unique redemption code");
  }
}

export const redemptionValidator = new RedemptionValidator();

// Export convenience functions for easier imports
export const validateRedemption = redemptionValidator.validateRedemption.bind(redemptionValidator);
export const generateRedemptionCode =
  redemptionValidator.generateRedemptionCode.bind(redemptionValidator);
