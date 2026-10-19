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
      "100 active contacts / mo",
      "500 campaign messages / mo",
      "WhatsApp · Instagram · Messenger inbox",
      "Automations, templates & chatbots",
      "Shop: products, orders & checkout in chat",
      "50 orders / mo",
      "Email support",
    ],
  },
  {
    name: "PLUS PLAN",
    displayName: "Starter",
    inrMonthly: 999,
    inrYearly: 9_990,
    usdMonthly: 19,
    usdYearly: 190,
    features: getPlusSubscriptionFeatures(),
    description: [
      "2 teams · 5 users",
      "1,000 active contacts / mo",
      "10,000 campaign messages / mo",
      "Loyalty & referrals",
      "Shopify + WhatsApp catalog sync",
      "Email support",
    ],
  },
  {
    name: "PRO PLAN",
    displayName: "Growth",
    badge: "Most popular",
    inrMonthly: 2_499,
    inrYearly: 24_990,
    usdMonthly: 59,
    usdYearly: 590,
    features: getProSubscriptionFeatures(),
    description: [
      "5 teams · 15 users",
      "5,000 active contacts / mo",
      "50,000 campaign messages / mo",
      "Everything in Starter",
      "Priority email support",
    ],
  },
  {
    name: "MAX PLAN",
    displayName: "Scale",
    inrMonthly: 7_999,
    inrYearly: 79_990,
    usdMonthly: 149,
    usdYearly: 1_490,
    features: getMaxSubscriptionFeatures(),
    description: [
      "15 teams · 50 users",
      "25,000 active contacts / mo",
      "250,000 campaign messages / mo",
      "Everything in Growth",
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
      "Custom active contacts / mo",
      "Custom campaign messages / mo",
      "Everything in Scale",
      "Dedicated account manager",
    ],
  },
];

export type AddonKind = "ACTIVE_CONTACTS" | "CAMPAIGN_CREDITS";

export interface AddonSpec {
  kind: AddonKind;
  /** The ADDON `RateupPlan.name` a purchase is recorded against. */
  name: string;
  displayName: string;
  /** What one pack adds: active contacts for its month, or campaign credits to draw down. */
  units: number;
  validDays: number;
  /** Charged once. Nothing renews a pack. */
  inrMonthly: number;
  usdMonthly: number;
  description: string[];
}

/**
 * Top-ups sold on a paid plan. A contact pack costs what Starter charges per contact, so
 * stacking them never beats upgrading; a credit pack costs what Growth charges per credit.
 * Free cannot buy either — upgrading raises every limit for little more.
 */
export const ADDONS: Record<AddonKind, AddonSpec> = {
  ACTIVE_CONTACTS: {
    kind: "ACTIVE_CONTACTS",
    // Renamed in place from the conversation pack, so packs already sold keep counting.
    name: "ACTIVE CONTACT PACK",
    displayName: "Active contact pack",
    units: 1_000,
    validDays: 30,
    inrMonthly: 999,
    usdMonthly: 19,
    description: [
      "1,000 extra active contacts",
      "Stacks — buy as many packs as you need",
      "One-off charge, no subscription",
      "Runs out on its own after 30 days",
    ],
  },
  CAMPAIGN_CREDITS: {
    kind: "CAMPAIGN_CREDITS",
    name: "CAMPAIGN CREDIT PACK",
    displayName: "Campaign credit pack",
    units: 10_000,
    validDays: 90,
    inrMonthly: 499,
    usdMonthly: 10,
    description: [
      "10,000 extra campaign messages",
      "Used after your plan's monthly credits",
      "One-off charge, no subscription",
      "Unused credits last 90 days",
    ],
  },
};

/** The pack's name before active-contact pricing; the seed task renames it. */
export const LEGACY_CONVERSATION_ADDON_NAME = "CONVERSATION PACK";
