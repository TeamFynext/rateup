/**
 * Shopify India plans, billed monthly — shared by the Shopify calculators.
 * Checked against shopify.com/in/pricing on 25 Oct 2026 (the page does not say
 * whether GST is included). Billed yearly they are ₹1,499 / ₹5,599 / ₹22,680.
 *
 * Shopify Payments is not offered in India, so every Indian store pays Shopify's
 * third-party transaction fee on top of its gateway's (Razorpay, PayU, Cashfree…).
 * Shopify changes these, so the tools only use them to pre-fill editable fields and
 * label them as list prices. Plus (from ₹1,75,000/month, 0.2%) is left out: its
 * price is a starting point, not a fixed list price.
 */
export type ShopifyPlan = "Basic" | "Grow" | "Advanced";

export const SHOPIFY_PLANS: Record<ShopifyPlan, { fee: number; txnPct: number }> = {
  Basic: { fee: 1994, txnPct: 2 },
  Grow: { fee: 7447, txnPct: 1 },
  Advanced: { fee: 30164, txnPct: 0.6 },
};

export const SHOPIFY_PLAN_NAMES = Object.keys(SHOPIFY_PLANS) as ShopifyPlan[];
