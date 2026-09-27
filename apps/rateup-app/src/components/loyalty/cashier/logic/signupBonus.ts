import type { LoyaltyProgram } from "@/api/loyalty/loyalty.type";

/**
 * The points promised to a customer enrolled at the counter. The amount is kept while the bonus
 * is switched off, and a server older than the switch sends no flag, which means on.
 * Mirrors rateup-ui's `CashierPage`.
 */
export function signupBonusFor(
  program: Pick<LoyaltyProgram, "signupBonus" | "signupBonusEnabled">,
): number {
  return program.signupBonusEnabled === false ? 0 : (program.signupBonus ?? 0);
}
