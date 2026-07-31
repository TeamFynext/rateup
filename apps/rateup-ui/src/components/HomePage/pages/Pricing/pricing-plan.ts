/** One gateway's pricing for a plan. */
export interface PricingGatewayPlan {
  amount: string | number;
  currency?: string;
  period?: string;
  planId?: string;
}

/** A subscription plan as the public pricing page renders it. */
export interface PricingPlan {
  id: string;
  name: string;
  displayName?: string;
  description?: string[];
  currency?: string;
  /** Marks the highlighted "most popular" card, and supplies its ribbon text. */
  badge?: string;
  tagline?: string;
  trialDays?: number;
  price?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  paymentPlan?: PricingGatewayPlan;
  monthlyPaymentPlan?: PricingGatewayPlan;
  yearlyPaymentPlan?: PricingGatewayPlan;
}
