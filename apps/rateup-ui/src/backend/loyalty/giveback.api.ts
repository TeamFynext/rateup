import type { GivebackResult } from "@/components/dashboard/loyalty/giveback/calculateGiveback";

import { axiosClient } from "../apiClient";
import { LOYALTY_BASE } from "./base";

/**
 * Mirrors `givebackResponseSchema` in `rateup-api/src/modules/loyalty/giveback/`. The
 * server runs the same `calculateGiveback` the wizard runs client-side, over the rows as
 * they stand — so the Overview and the Program page can quote a number that agrees with
 * what activation warned about.
 */
export interface LoyaltyGivebackResponse {
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

export async function getLoyaltyGiveback(): Promise<LoyaltyGivebackResponse> {
  return (await axiosClient.get(`${LOYALTY_BASE}/giveback`)).data;
}
