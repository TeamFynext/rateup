import { useMemo } from "react";

import { useLoyaltyEarningRules } from "@/backend/loyalty/earningRules.query";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";

import { toFiniteNumber } from "./calculateGiveback";

export interface RewardEconomicsContext {
  earnRate: { pointsPerUnit: number; multiplier: number };
  averageOrderValue: number | null;
  currencySymbol: string;
  currencyCode: string;
  pointsName: string;
}

/**
 * Everything `RewardWorthLine` needs, outside the onboarding wizard.
 *
 * The wizard has all of this in one place because it is mid-setup; the standalone editor
 * has to fetch it. Both queries are already cached app-wide, so this adds no request in
 * practice — the rewards page loads the program anyway.
 *
 * Only the default earning rule is used: the rest are conditional (weekends, day ranges)
 * and averaging them would need a traffic assumption we do not have.
 */
export function useRewardEconomicsContext(): RewardEconomicsContext {
  const { data: program } = useLoyaltyProgram();
  const { data: rules } = useLoyaltyEarningRules();

  return useMemo(() => {
    const active = (rules ?? []).filter((rule) => rule.status !== "inactive");
    const rule = active.find((r) => r.isDefault) ?? active[0];

    return {
      earnRate: {
        pointsPerUnit: toFiniteNumber(rule?.pointsPerUnit),
        multiplier: toFiniteNumber(rule?.multiplier, 1),
      },
      // null, not a fallback: "never told us" must not become a real number.
      averageOrderValue:
        program?.averageOrderValue === null || program?.averageOrderValue === undefined
          ? null
          : toFiniteNumber(program.averageOrderValue),
      currencySymbol: program?.currencySymbol ?? "₹",
      currencyCode: program?.currencyCode ?? "INR",
      pointsName: program?.currencyName ?? "Points",
    };
  }, [program, rules]);
}
