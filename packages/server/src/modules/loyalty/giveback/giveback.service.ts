import prisma from "../../../utils/prisma.js";
import {
  calculateGiveback,
  toFiniteNumber,
  type GivebackInput,
  type GivebackResult,
} from "../giveback.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";
import { LoyaltyRewardStatus } from "../rewards/reward.schema.js";

/**
 * Assembles `GivebackInput` from the live tables.
 *
 * Two callers need the same assembly: `activateProgram` (to warn at launch) and the
 * Overview/Program pages (through `GET /loyalty/giveback`). Keeping it here means the
 * two can never disagree about which rule, which rewards and which tiers count.
 *
 * Scoping rules, inherited from the wizard and mirrored in the UI's
 * `useProgrammeGiveback`:
 *  - only the DEFAULT active earning rule feeds the estimate;
 *  - only ACTIVE rewards are priced (coupons and gifts at pointsCost 0 are skipped by
 *    `calculateGiveback` itself).
 */

/* Field-level shapes rather than Prisma model types, so both a full row and a
   `select`ed subset satisfy them. Decimal columns arrive as objects or strings. */
export interface GivebackProgramSource {
  averageOrderValue: unknown;
  tiersEnabled: boolean;
  signupBonus: number;
  referralBonus: number;
  refereeBonus: number;
  /** Absent reads as on, like the column default. */
  signupBonusEnabled?: boolean;
  referralBonusEnabled?: boolean;
}
export interface GivebackRuleSource {
  id?: string;
  name?: string | null;
  pointsPerUnit: unknown;
  multiplier: unknown;
  bonusPoints: unknown;
}
export interface GivebackRewardSource {
  name: string;
  pointsCost: number;
  rewardValue: unknown;
}
export interface GivebackTierSource {
  name: string;
  threshold: unknown;
  pointsMultiplier: unknown;
  color?: string | null;
}

/** Pure. A missing default rule is an earn rate of 0, which `calculateGiveback` reports as `no_earning`. */
export function buildGivebackInput(
  program: GivebackProgramSource,
  defaultRule: GivebackRuleSource | null,
  rewards: GivebackRewardSource[],
  tiers: GivebackTierSource[],
): GivebackInput {
  return {
    earnRate: {
      pointsPerUnit: toFiniteNumber(defaultRule?.pointsPerUnit),
      multiplier: toFiniteNumber(defaultRule?.multiplier, 1),
      bonusPoints: toFiniteNumber(defaultRule?.bonusPoints),
    },
    rewards: rewards.map((reward) => ({
      name: reward.name,
      pointsCost: reward.pointsCost,
      rewardValue: reward.rewardValue,
    })),
    // null, not a fallback: "never told us" must not silently become a real number.
    averageOrderValue:
      program.averageOrderValue === null || program.averageOrderValue === undefined
        ? null
        : toFiniteNumber(program.averageOrderValue),
    tiersEnabled: program.tiersEnabled,
    tiers: tiers.map((tier) => ({
      name: tier.name,
      threshold: toFiniteNumber(tier.threshold),
      pointsMultiplier: toFiniteNumber(tier.pointsMultiplier, 1),
      ...(tier.color ? { color: tier.color } : {}),
    })),
    bonuses: {
      signupBonus: program.signupBonusEnabled === false ? 0 : program.signupBonus,
      referralBonus: program.referralBonusEnabled === false ? 0 : program.referralBonus,
      refereeBonus: program.referralBonusEnabled === false ? 0 : program.refereeBonus,
    },
  };
}

/**
 * The three reads `activateProgram` needs. Kept as three explicit queries — with these
 * exact `where` clauses — because the activate tests mock them individually.
 */
export async function loadProgramGivebackSources(programId: string) {
  const [defaultRule, rewards, tiers] = await Promise.all([
    prisma.loyaltyEarningRule.findFirst({
      where: { programId, isDefault: true, status: "active" },
      select: { id: true, name: true, pointsPerUnit: true, multiplier: true, bonusPoints: true },
    }),
    prisma.loyaltyReward.findMany({
      where: { programId, status: LoyaltyRewardStatus.ACTIVE },
      select: { name: true, pointsCost: true, rewardValue: true },
    }),
    prisma.loyaltyTier.findMany({
      where: { programId },
      select: { name: true, threshold: true, pointsMultiplier: true, color: true },
      orderBy: { threshold: "asc" },
    }),
  ]);

  return { defaultRule, rewards, tiers };
}

export interface GivebackResponse {
  programExists: boolean;
  programId: string | null;
  result: GivebackResult | null;
  inputs: {
    pointsName: string;
    currencySymbol: string;
    currencyCode: string;
    averageOrderValue: number | null;
    defaultRule: {
      id: string;
      name: string | null;
      pointsPerUnit: number;
      multiplier: number;
      bonusPoints: number;
    } | null;
    tiersEnabled: boolean;
    rewardsConsidered: number;
  } | null;
}

/**
 * What the org's programme gives back, from the rows as they stand right now. One query:
 * `getLoyaltyProgramByOrg` already loads tiers, active rules and ACTIVE rewards.
 */
export async function getProgramGiveback(orgId: string): Promise<GivebackResponse> {
  const program = await getLoyaltyProgramByOrg(orgId);
  if (!program) {
    return { programExists: false, programId: null, result: null, inputs: null };
  }

  const defaultRule = program.earningRules.find((rule) => rule.isDefault) ?? null;
  const input = buildGivebackInput(program, defaultRule, program.rewards, program.tiers);

  return {
    programExists: true,
    programId: program.id,
    result: calculateGiveback(input),
    inputs: {
      pointsName: program.currencyName,
      currencySymbol: program.currencySymbol,
      currencyCode: program.currencyCode,
      averageOrderValue: input.averageOrderValue,
      defaultRule: defaultRule
        ? {
            id: defaultRule.id,
            name: defaultRule.name,
            pointsPerUnit: input.earnRate.pointsPerUnit,
            multiplier: input.earnRate.multiplier,
            bonusPoints: input.earnRate.bonusPoints,
          }
        : null,
      tiersEnabled: program.tiersEnabled,
      rewardsConsidered: program.rewards.length,
    },
  };
}
