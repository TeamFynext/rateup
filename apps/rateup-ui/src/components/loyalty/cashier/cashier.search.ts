import { coercedString, oneOf } from "@/utils/search.ts";

/**
 * The cashier's URL state, shared by the dashboard route and the standalone `/cashier`.
 * The router's default search parser JSON-parses values, so an all-digit phone arrives as a
 * number — hence the coercion.
 */
export const CASHIER_STEPS = [
  "search",
  "new",
  "contacts",
  "customer",
  "purchase",
  "redeem",
  "coupon",
  "gift",
] as const;
export type CashierStep = (typeof CASHIER_STEPS)[number];

export interface CashierSearch {
  phone?: string;
  step?: CashierStep;
}

export function validateCashierSearch(search: Record<string, unknown>): CashierSearch {
  return { phone: coercedString(search.phone), step: oneOf(CASHIER_STEPS, search.step) };
}
