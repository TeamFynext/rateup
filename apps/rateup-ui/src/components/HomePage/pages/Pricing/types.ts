/**
 * The plan shape the public pricing page works with.
 *
 * It is deliberately separate from the global `SPlan` (which models a
 * subscription's stored base plan): the pricing page merges gateway-specific
 * pricing onto each plan and appends placeholder "Lets Talk!" enterprise tiers,
 * so several fields are wider or absent here.
 */

/** One gateway's pricing for a plan. */
export interface PricingGatewayPlan {
  /** A number for real plans; the enterprise placeholders use "Lets Talk!". */
  amount: string | number;
  currency?: string;
  period?: string;
  planId?: string;
}

export interface PricingPlan {
  id?: string;
  name?: string;
  displayName?: string;
  description?: string[];
  tagline?: string;
  badge?: string;
  currency?: string;
  price?: string | number;
  monthlyPrice?: string | number;
  yearlyPrice?: string | number;
  trialDays?: number;
  paymentPlan?: PricingGatewayPlan;
  monthlyPaymentPlan?: PricingGatewayPlan;
  yearlyPaymentPlan?: PricingGatewayPlan;
  stripeProduct?: StripeProduct;
}
