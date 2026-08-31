import { useMemo } from "react";

import { useLoyaltyEarningRules } from "@/backend/loyalty/earningRules.query";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import { useLoyaltyRewards } from "@/backend/loyalty/reward.query";
import { useLoyaltyTiers } from "@/backend/loyalty/tiers.query";

import { toFiniteNumber, type GivebackInput } from "./calculateGiveback";

export interface ProgrammeGiveback extends GivebackInput {
  currencySymbol: string;
  currencyCode: string;
  pointsName: string;
}

/**
 * The whole programme's giveback input, assembled from the live tables.
 *
 * The wizard has all of this in hand because it is mid-setup and builds it once per page
 * (`onboarding/givebackContext.ts`); the standing editors have to fetch it. All four queries
 * are cached app-wide and every page using this already loads at least three of them, so in
 * practice this adds no request.
 *
 * Two scoping rules are inherited from the wizard and must not drift:
 *  - only the DEFAULT earning rule feeds the estimate — the rest are conditional (weekends,
 *    day ranges) and averaging them would need traffic data nobody has;
 *  - only point-cost rewards are priced. Coupons and assigned gifts carry `pointsCost: 0`,
 *    are not bought with points, and `calculateGiveback` would only skip them anyway.
 */
export function useProgrammeGiveback(): ProgrammeGiveback {
  const { data: program } = useLoyaltyProgram();
  const { data: rules } = useLoyaltyEarningRules();
  const { data: rewards } = useLoyaltyRewards();
  const { data: tiers } = useLoyaltyTiers();

  return useMemo(() => {
    const active = (rules ?? []).filter((rule) => rule.status !== "inactive");
    const rule = active.find((r) => r.isDefault) ?? active[0];

    return {
      earnRate: {
        pointsPerUnit: toFiniteNumber(rule?.pointsPerUnit),
        multiplier: toFiniteNumber(rule?.multiplier, 1),
        bonusPoints: toFiniteNumber(rule?.bonusPoints),
      },
      rewards: (rewards ?? [])
        .filter((reward) => reward.rewardType === "point")
        .map((reward) => ({
          name: reward.name,
          pointsCost: reward.pointsCost,
          rewardValue: reward.rewardValue as unknown,
        })),
      // null, not a fallback: "never told us" must not silently become a real number.
      averageOrderValue:
        program?.averageOrderValue === null || program?.averageOrderValue === undefined
          ? null
          : toFiniteNumber(program.averageOrderValue),
      tiersEnabled: program?.tiersEnabled ?? false,
      tiers: (tiers ?? []).map((tier) => ({
        name: tier.name,
        threshold: toFiniteNumber(tier.threshold),
        // Prisma hands `pointsMultiplier` back as a Decimal-as-string on this client.
        pointsMultiplier: toFiniteNumber(tier.pointsMultiplier, 1),
        color: tier.color,
      })),
      bonuses: {
        signupBonus: program?.signupBonus ?? 0,
        referralBonus: program?.referralBonus ?? 0,
        refereeBonus: program?.refereeBonus ?? 0,
      },
      currencySymbol: program?.currencySymbol ?? "₹",
      currencyCode: program?.currencyCode ?? "INR",
      pointsName: program?.currencyName ?? "Points",
    };
  }, [program, rules, rewards, tiers]);
}
