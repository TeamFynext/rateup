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
} from "../../types/loyalty.js";

dayjs.extend(utc);

/** How many times to redraw a code before giving up on finding a free one. */
const CODE_ATTEMPTS = 5;

/**
 * Every clock in this file is UTC.
 *
 * It used to be split: `allowed_days` was matched with `getDay()` and
 * `allowed_time_ranges` with `toTimeString()` — the PROCESS's local timezone —
 * while `blackout_dates` in the same function was matched against
 * `toISOString().split("T")[0]`, which is UTC. Near midnight the two halves
 * actively disagreed, and the same rules produced different answers if the API
 * moved region.
 *
 * UTC is not the right answer — the right answer is the merchant's timezone, and
 * nothing in the codebase carries one (the same gap as issues.txt 19.9). It is
 * the answer that is at least consistent, deployment-independent and reproducible,
 * which the previous mixture was not. See issues.txt 20.2.
 */
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

    // The account is resolved FIRST and the reward is then looked up THROUGH the
    // account's program. Both used to be fetched independently by id, with no
    // relation between them ever asserted — so a reward belonging to one program
    // could be validated, and then redeemed, against an account in another. This
    // is the one function whose whole job is to decide whether a redemption is
    // allowed, and "do these two things belong together" was the precondition it
    // never established. A reward in another program now reads as absent, which is
    // what it is from this account's point of view. See issues.txt 20.1 and 20.20.
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

    // Check if reward type is 'assigned' and if it is assigned to the customer
    if (reward.rewardType === "assigned") {
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

    // `?? {}` because the column is nullable and this file used to read it as if
    // it were not, while redemption.service.ts read the very same column with
    // `?.`. createLoyaltyReward defaults it to `{}`, so only rewards written
    // before that default — or written directly — threw here; two files
    // disagreeing about one nullable column is the kind of thing that changes
    // behaviour on a data migration. See issues.txt 20.8.
    const rules = (reward.redemptionRules ?? {}) as LoyaltyRedemptionRules;

    // 1. Check points balance (skip for assigned type rewards)
    if (reward.rewardType !== "assigned" && customer.currentPoints < reward.pointsCost) {
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

    // 5. Spend requirements
    //
    // The `&& context.purchase_amount` that used to guard this let the CALLER
    // decide whether the rule applied: a missing amount, or an amount of zero,
    // skipped the check and the redemption passed. redeemReward builds its context
    // as `{ locationId }` and never sets purchase_amount at all, so the
    // minimum-spend rule was not enforced on any redemption made through the only
    // path that exists. A missing amount is now zero, which fails any minimum
    // worth setting. See issues.txt 20.5.
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

    // 7. Stock check
    //
    // Enforced whenever the reward carries a stock quantity, rather than only when
    // the rules JSON opts in with an `inventory` block. stockQuantity and
    // stockRedeemed live on the reward row and are set from the reward form,
    // independently of that JSON — so the two halves of one feature were gated by
    // different switches, and a reward configured with a quantity but no inventory
    // block oversold without limit while still counting every redemption against a
    // number nothing acted on. See issues.txt 20.7.
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

    // The day, week and month limits are all CALENDAR windows in UTC, counted from
    // createdAt.
    //
    // They used to be three different notions of a period in one function: the
    // daily one counted from local midnight (calendar), the weekly one counted back
    // seven days from now (rolling), and the monthly one used
    // `setMonth(getMonth() - 1)` — rolling, and subject to JS's month-length
    // roll-forward, so on the 31st of a month the "monthly" window silently became
    // 28 days. A reward carrying both a daily and a weekly limit therefore applied
    // two different kinds of window, and the weekly one never reset on a boundary
    // the customer could predict. Calendar is the one a customer can reason about:
    // "twice a week" means twice this week. See issues.txt 20.3.
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
    // An enabled cooldown with no period used to be reached through a non-null
    // assertion — `rules.cooldown.period_hours!` — over a value the rules JSON need
    // not contain, and every comparison against undefined is false, so
    // `hoursSince < undefined` never fired. The rule looked active in the admin UI
    // and enforced nothing. A cooldown that cannot be evaluated is a configuration
    // error, and the safe reading of one is to refuse rather than to allow.
    // See issues.txt 20.4.
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
    // The `&& customerTierId` that used to close this condition meant a customer
    // with NO tier skipped the comparison entirely, and so passed every
    // tier-exclusive restriction including the top one. That was not an edge case:
    // new accounts were created untiered whenever the program's entry-tier lookup
    // missed, which it did for every single-tier program (issues.txt 20.11).
    // A null tier is not in any list, so it does not match one. See issues.txt 20.6.
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

  /**
   * Generate a redemption code that is not already in use.
   *
   * A redemption code is a bearer token for a discount, so it is drawn from
   * crypto.randomBytes rather than Math.random and it is checked against the
   * unique column before being handed out.
   *
   * The old implementation was `"RU-" + Math.random().toString(36).substring(2, 8)
   * .toUpperCase()`: non-cryptographic, never compared against the table, and
   * length-dependent on the random value it happened to draw — `(0.5)
   * .toString(36)` is "0.i", so the code became "RU-I", and a draw of exactly 0
   * yielded a bare "RU-". Ten characters from an unambiguous 32-symbol alphabet is
   * 50 bits, which is not guessable at any rate the API will serve.
   * See issues.txt 20.9.
   */
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
