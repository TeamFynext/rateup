/**
 * The counter's steps.
 *
 * On the web these live in the URL (`?phone=&step=`) behind a zod schema. There is no URL
 * here and no zod in this app, so the schema becomes one hand-written guard — used when a
 * step is read back out of storage, which is the only place an unknown value can arrive.
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

/** The steps a customer must be open for. Reached without one, they fall back to `search`. */
const NEEDS_CUSTOMER: ReadonlySet<CashierStep> = new Set<CashierStep>([
  "customer",
  "purchase",
  "redeem",
  "gift",
]);

export function parseStep(value: unknown): CashierStep | null {
  return CASHIER_STEPS.find((step) => step === value) ?? null;
}

/**
 * Where the back gesture goes.
 *
 * Every web navigation was `replace: true`, so there was no history to walk back through —
 * which is fine with a browser back button pointing at the page before the cashier, and not
 * fine with Android's, which would leave the tab. The graph the web implied has to be
 * written out for the hardware button to follow it. `null` means "not ours" — let the
 * navigator handle it.
 */
export function stepBack(step: CashierStep): CashierStep | null {
  switch (step) {
    case "purchase":
    case "redeem":
    case "gift":
      return "customer";
    case "coupon":
    case "customer":
    case "new":
    case "contacts":
      return "search";
    case "search":
      return null;
  }
}

/** Whether this step can be shown for the phone currently open. */
export function stepIsReachable(step: CashierStep, phone: string | null): boolean {
  return Boolean(phone) || !NEEDS_CUSTOMER.has(step);
}
