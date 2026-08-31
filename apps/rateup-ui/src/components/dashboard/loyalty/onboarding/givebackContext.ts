import type {
  LoyaltyPreset,
  LoyaltyPresetKey,
  OnboardingState,
} from "@/backend/loyalty/onboarding.api";

import { toFiniteNumber, type GivebackInput } from "../giveback/calculateGiveback";

/**
 * Everything the giveback estimate needs that a single wizard step does not have.
 *
 * Each step edits one slice of the programme, but the percentage depends on all of it —
 * the earning step needs reward costs, the rewards step needs the earn rate. So the page
 * assembles the whole picture once and each step overrides only the part it owns.
 */
export interface GivebackContext extends GivebackInput {
  currencySymbol: string;
  currencyCode: string;
  pointsName: string;
  /** Which starter pack is in play — picks the free-item vocabulary in the Add dialog. */
  presetKey: LoyaltyPresetKey;
}

/**
 * Prefers rows already written over the preset's suggestions, exactly as the steps'
 * `defaultValues` do — a step the user has saved must read back what they saved, not
 * what the preset proposed. Kept here so the two cannot drift.
 */
export function buildGivebackContext(
  state: OnboardingState,
  preset: LoyaltyPreset,
): GivebackContext {
  const program = state.program;
  const saved = state.saved;

  const savedDefaultRule = saved.rules.find((rule) => rule.isDefault) ?? saved.rules[0];
  const presetDefaultRule =
    preset.earningRules.find((rule) => rule.isDefault) ?? preset.earningRules[0];

  // Only the default rule feeds the estimate: the others are conditional (weekends, day
  // ranges) and averaging them would need a traffic assumption we do not have.
  const earnRate = savedDefaultRule
    ? {
        pointsPerUnit: Number(savedDefaultRule.pointsPerUnit),
        multiplier: Number(savedDefaultRule.multiplier),
        bonusPoints: savedDefaultRule.bonusPoints ?? 0,
      }
    : {
        pointsPerUnit: presetDefaultRule?.pointsPerUnit ?? 0,
        multiplier: presetDefaultRule?.multiplier ?? 1,
        bonusPoints: presetDefaultRule?.bonusPoints ?? 0,
      };

  const rewards = saved.rewards.length
    ? saved.rewards.map((reward) => ({
        name: reward.name,
        pointsCost: reward.pointsCost,
        rewardValue: reward.rewardValue as unknown,
      }))
    : preset.rewards.map((reward) => ({
        name: reward.name,
        pointsCost: reward.pointsCost,
        rewardValue: reward.rewardValue as unknown,
      }));

  const tiers = saved.tiers.length
    ? saved.tiers.map((tier) => ({
        name: tier.name,
        threshold: Number(tier.threshold),
        pointsMultiplier: Number(tier.pointsMultiplier),
        color: tier.color,
      }))
    : preset.tiers.map((tier) => ({
        name: tier.name,
        threshold: tier.threshold,
        pointsMultiplier: tier.multiplier,
        color: tier.color,
      }));

  return {
    presetKey: preset.key,
    currencySymbol: program?.currencySymbol ?? "₹",
    currencyCode: program?.currencyCode ?? "INR",
    pointsName: program?.currencyName ?? preset.basics.currencyName,
    // null, not a fallback: "never told us" must not silently become a real number.
    // Coerced because a Prisma Decimal arrives as a string, and callers do arithmetic and
    // `Number.isInteger` on it.
    averageOrderValue:
      program?.averageOrderValue === null || program?.averageOrderValue === undefined
        ? null
        : toFiniteNumber(program.averageOrderValue),
    earnRate,
    rewards,
    tiersEnabled: program?.tiersEnabled ?? preset.tiersEnabled,
    tiers,
    bonuses: {
      signupBonus: program?.signupBonus ?? preset.basics.signupBonus,
      referralBonus: program?.referralBonus ?? preset.basics.referralBonus,
      refereeBonus: program?.refereeBonus ?? preset.basics.refereeBonus,
    },
  };
}
