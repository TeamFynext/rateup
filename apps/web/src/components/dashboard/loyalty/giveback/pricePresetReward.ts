import { roundNice, suggestPointsCost } from "./suggestPointsCost.ts";

/**
 * A preset reward's `pointsCost`, priced for the merchant's own earn rate.
 *
 * The presets ship hand-tuned costs that give back ~3% at one point per currency unit. A
 * merchant who chose a different rate on the Earning step would otherwise inherit rewards
 * priced for a rate they never picked — ten times too cheap or too dear.
 */
export function pricePresetReward(
  reward: { pointsCost: number; rewardValue: unknown },
  earnRate: { pointsPerUnit: number; multiplier: number },
  averageOrderValue: number | null,
): number {
  const rate = Number(earnRate.pointsPerUnit) * (Number(earnRate.multiplier) || 1);
  if (!Number.isFinite(rate) || rate <= 0) return reward.pointsCost;

  const suggested = suggestPointsCost({
    rewardValue: reward.rewardValue,
    earnRate,
    averageOrderValue,
  });
  if (suggested !== null) return suggested;

  // Unpriceable here (a percentage reward with no typical order value yet): the shipped
  // cost assumes rate 1, so scaling it keeps its ~3% at the preset's own order value.
  return Math.max(1, roundNice(reward.pointsCost * rate));
}
