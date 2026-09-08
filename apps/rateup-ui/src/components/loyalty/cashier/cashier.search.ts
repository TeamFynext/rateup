import { z } from "zod";

/**
 * The cashier's URL state, shared by the dashboard route and the standalone `/cashier`.
 * The router's default search parser JSON-parses values, so an all-digit phone arrives as a
 * number — hence the coercion.
 */
export const CASHIER_STEPS = [
  "search",
  "new",
  "customer",
  "purchase",
  "redeem",
  "coupon",
  "gift",
] as const;
export type CashierStep = (typeof CASHIER_STEPS)[number];

export const cashierSearchSchema = z.object({
  phone: z.coerce.string().optional().catch(undefined),
  step: z.enum(CASHIER_STEPS).optional().catch(undefined),
});
export type CashierSearch = z.infer<typeof cashierSearchSchema>;
