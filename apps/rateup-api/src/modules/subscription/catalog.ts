import {
  getEnterpriseSubscriptionFeatures,
  getFreeSubscriptionFeatures,
  getMaxSubscriptionFeatures,
  getPlusSubscriptionFeatures,
  getProSubscriptionFeatures,
} from "./subscription.data.js";

/**
 * The plan catalog, as one definition.
 *
 * Prices, limits and card copy all lived inside the seed task, which meant the same
 * bullets were written out again in the restructure task and nowhere at all in the
 * refresh. The stored rows drifted as a result — after the four-tier rename, Max still
 * advertised "Everything in Starter" and Enterprise "Everything in Pro", months after
 * neither tier existed under those names. Everything that writes a tier reads this now,
 * so the copy can only be wrong in one place.
 */
export interface TierSpec {
  name: string;
  displayName: string;
  badge?: string;
  /** Annual is the headline cadence; monthly is the annual monthly-equivalent x 1.20. */
  inrMonthly: number;
  inrYearly: number;
  /**
   * The dollar list price. Annual is ten months' worth, the same "two months free"
   * relationship the INR side uses — so a tier's two cadences cannot drift apart.
   */
  usdMonthly: number;
  usdYearly: number;
  features: SubscriptionFeatures;
  description: string[];
  /** Sales-led: no gateway products, no fixed price. */
  salesLed?: boolean;
}

export const CATALOG_TIERS: TierSpec[] = [
  {
    // Free predates the catalog seed, so its stored row still carried the legacy
    // description and feature blob. Seeding it here keeps the marketing page, the
    // plan catalog and getFreeSubscriptionFeatures() telling the same story.
    name: "FREE PLAN",
    displayName: "Free",
    inrMonthly: 0,
    inrYearly: 0,
    usdMonthly: 0,
    usdYearly: 0,
    salesLed: true,
    features: getFreeSubscriptionFeatures(),
    description: [
      "1 team · 1 user",
      "100 conversations / mo",
      "100 form submissions / mo",
      "WhatsApp · Instagram · Messenger inbox",
      "Automations, templates & chatbots",
      "Campaigns",
      "Email support",
    ],
  },
  {
    name: "PLUS PLAN",
    displayName: "Plus",
    inrMonthly: 2_400,
    inrYearly: 24_000,
    usdMonthly: 30,
    usdYearly: 300,
    features: getPlusSubscriptionFeatures(),
    description: [
      "2 teams · 10 users",
      "5,000 conversations / mo",
      "5,000 form submissions / mo",
      "Loyalty & referrals",
      "Shopify + WhatsApp catalog sync",
      "Email support",
    ],
  },
  {
    name: "PRO PLAN",
    displayName: "Pro",
    badge: "Most popular",
    inrMonthly: 4_800,
    inrYearly: 48_000,
    usdMonthly: 60,
    usdYearly: 600,
    features: getProSubscriptionFeatures(),
    description: [
      "5 teams · 30 users",
      "20,000 conversations / mo",
      "20,000 form submissions / mo",
      "Everything in Plus",
      "Priority email support",
    ],
  },
  {
    name: "MAX PLAN",
    displayName: "Max",
    inrMonthly: 9_600,
    inrYearly: 96_000,
    usdMonthly: 120,
    usdYearly: 1_200,
    features: getMaxSubscriptionFeatures(),
    description: [
      "10 teams · 100 users",
      "50,000 conversations / mo",
      "50,000 form submissions / mo",
      "Everything in Pro",
      "Meta Business Agent (AI)",
      "Phone support",
    ],
  },
  {
    name: "ENTERPRISE PLAN",
    displayName: "Enterprise",
    inrMonthly: 0,
    inrYearly: 0,
    usdMonthly: 0,
    usdYearly: 0,
    salesLed: true,
    features: getEnterpriseSubscriptionFeatures(),
    description: [
      "Unlimited teams & users",
      "Unlimited conversations / mo",
      "Unlimited form submissions / mo",
      "Everything in Max",
      "Dedicated account manager",
    ],
  },
];

/**
 * A pack of extra conversations, sold on top of a plan.
 *
 * Priced so stacking packs stays cheaper than the next tier until an org is most of the
 * way to that tier's allowance, at which point upgrading wins on price alone. Plus is
 * ₹2,400/mo for 5,000; one pack on top (₹3,600) buys 10,000 for less than Pro, but a
 * second lands on Pro's own ₹4,800 while still buying 5,000 fewer conversations.
 *
 * Add-ons attach to a paid subscription. A free org cannot buy one — there is no
 * subscription for the pack to sit alongside, and the upgrade is the cheaper answer
 * anyway.
 */
export const CONVERSATION_ADDON = {
  name: "CONVERSATION PACK",
  displayName: "Conversation pack",
  /** Extra metered conversations one pack is worth, for the month it covers. */
  conversations: 5_000,
  /** Charged once, for one month. Nothing renews it. */
  inrMonthly: 1_200,
  usdMonthly: 19,
  description: [
    "5,000 extra conversations for one month",
    "Stacks — buy as many packs as you need",
    "One-off charge, no subscription",
    "Runs out on its own after 30 days",
  ],
} as const;
