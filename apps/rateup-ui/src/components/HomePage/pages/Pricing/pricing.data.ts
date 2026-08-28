import type { RateupGatewayPlan, RateupPaymentPlan } from "@/backend/payment/payment.api";

export type BillingPeriod = "monthly" | "yearly";
export type PricingCurrency = "USD" | "INR";

export const CURRENCY_SYMBOL: Record<PricingCurrency, string> = { USD: "$", INR: "₹" };

/**
 * Counts at or above this render as "Unlimited". The API writes a large sentinel for
 * the Enterprise tier rather than null/Infinity so every `used >= max` comparison on
 * the server keeps working; the UI has to translate it back.
 */
const UNLIMITED_THRESHOLD = 1_000_000;

/** Whether a catalog count is the "no cap" sentinel rather than a real limit. */
export function isUnlimitedCount(value: number | null | undefined): boolean {
  return typeof value === "number" && value >= UNLIMITED_THRESHOLD;
}

/**
 * The tiers the pricing page sells, in display order. The catalog also holds legacy and
 * test rows ("custom", "Rateup Essentials Yearly", assorted scratch plans) that are
 * still referenced by existing subscriptions and so cannot be deleted — matching on the
 * canonical names is what keeps them off the marketing page.
 */
export const CATALOG_TIER_ORDER = [
  "FREE PLAN",
  "PLUS PLAN",
  "PRO PLAN",
  "MAX PLAN",
  "ENTERPRISE PLAN",
] as const;

/**
 * Taglines are the one piece of card copy with no column behind it — `description` is
 * the bullet list and `displayName` is the heading. Keyed by plan name so a tier
 * without an entry simply renders no tagline rather than breaking.
 */
const TAGLINES: Record<string, string> = {
  "FREE PLAN": "Test WhatsApp automation end to end.",
  "PLUS PLAN": "For growing shops running real campaigns.",
  "PRO PLAN": "Scaling teams past their first 10,000 conversations.",
  "MAX PLAN": "High-volume teams with AI in the loop.",
  "ENTERPRISE PLAN": "Unlimited volume, contracted terms.",
};

export interface PricingTier {
  id: string;
  planName: string;
  name: string;
  tagline?: string;
  badge?: string | null;
  cta: string;
  featured: boolean;
  /** No gateway product: Free is signup, Enterprise is a sales conversation. */
  salesLed: boolean;
  free: boolean;
  features: string[];
  price: { monthly: number; yearly: number } | null;
  /** The dollar list price, when the catalog carries one. */
  usdPrice: { monthly: number; yearly: number } | null;
  currency?: string;
  monthlyPaymentPlan?: RateupGatewayPlan;
  yearlyPaymentPlan?: RateupGatewayPlan;
  /** The same cadences as plans that charge dollars. */
  usdMonthlyPaymentPlan?: RateupGatewayPlan;
  usdYearlyPaymentPlan?: RateupGatewayPlan;
  paymentPlan?: RateupGatewayPlan;
  raw: RateupPaymentPlan;
}

function num(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPrice(currency: PricingCurrency, amount: number) {
  // en-IN gives the lakh grouping (₹1,08,000) the pricing copy uses.
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return `${CURRENCY_SYMBOL[currency]}${amount.toLocaleString(locale)}`;
}

export function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (isUnlimitedCount(value)) return "Unlimited";
  return value.toLocaleString("en-US");
}

/** Reads a nested `active` flag, treating an absent sub-gate as inheriting its parent. */
function whatsappGate(
  features: Partial<SubscriptionFeatures> | undefined,
  key: "campaign" | "loyalty" | "referrals" | "catalog",
) {
  const whatsapp = features?.whatsapp as Record<string, { active?: boolean }> | undefined;
  const gate = whatsapp?.[key];
  if (gate && typeof gate.active === "boolean") return gate.active;
  // Mirrors isSubscriptionGateOpen on the API: a blob written before these keys existed
  // inherits whatsapp.active rather than reading as false.
  return Boolean((whatsapp as { active?: boolean } | undefined)?.active);
}

/**
 * Builds the cards from the plans endpoint. Everything the card shows — name, badge,
 * bullets, prices, gateway links — comes off the API row, so the page
 * cannot advertise something the catalog does not actually sell.
 */
/**
 * Position of a plan on the upgrade ladder, or -1 when it is not on the ladder at all.
 *
 * Legacy and bespoke plans ("custom", the old "Rateup Essentials Yearly") are still
 * attached to live subscriptions but have no defined rank, so callers must treat -1 as
 * "cannot compare" and fall back to showing everything rather than guessing whether a
 * catalog tier would be an upgrade or a downgrade for them.
 */
export function tierRank(planName: string | undefined | null): number {
  if (!planName) return -1;
  return CATALOG_TIER_ORDER.indexOf(planName as (typeof CATALOG_TIER_ORDER)[number]);
}

export function buildTiers(plans: RateupPaymentPlan[] | undefined): PricingTier[] {
  const byName = new Map((plans ?? []).map((plan) => [plan.name, plan]));

  return CATALOG_TIER_ORDER.map((name) => byName.get(name))
    .filter((plan): plan is RateupPaymentPlan => Boolean(plan?.features))
    .map((plan) => {
      const monthly = num(plan.monthlyPrice);
      const yearly = num(plan.yearlyPrice);
      const usdMonthly = num(plan.usdMonthlyPrice);
      const usdYearly = num(plan.usdYearlyPrice);
      const free = plan.name === "FREE PLAN";

      return {
        id: plan.id,
        planName: plan.name,
        name: plan.displayName || plan.name,
        tagline: TAGLINES[plan.name],
        badge: plan.badge,
        featured: Boolean(plan.badge),
        salesLed: !monthly && !yearly && !free,
        free,
        cta: free ? "Create free account" : !monthly && !yearly ? "Talk to sales" : "Choose plan",
        features: plan.description ?? [],
        price: monthly && yearly ? { monthly, yearly } : null,
        usdPrice: usdMonthly && usdYearly ? { monthly: usdMonthly, yearly: usdYearly } : null,
        currency: plan.currency ?? undefined,
        monthlyPaymentPlan: plan.monthlyPaymentPlan,
        yearlyPaymentPlan: plan.yearlyPaymentPlan,
        usdMonthlyPaymentPlan: plan.usdMonthlyPaymentPlan,
        usdYearlyPaymentPlan: plan.usdYearlyPaymentPlan,
        paymentPlan: plan.paymentPlan,
        raw: plan,
      };
    });
}

type Cell = string | boolean | null;

export interface ComparisonRow {
  label: string;
  cells: Cell[];
}

export interface ComparisonGroup {
  title: string;
  rows: ComparisonRow[];
}

/**
 * Derives the feature matrix from each plan's own `features` JSON — the very blob the
 * API's canAccess() enforces against. That is the point: a gate change on the server
 * shows up here on the next request instead of drifting until someone notices the
 * marketing page is promising a feature that 403s.
 */
export function buildComparison(tiers: PricingTier[]): ComparisonGroup[] {
  const f = (tier: PricingTier) => tier.raw.features;

  const limitRow = (label: string, read: (tier: PricingTier) => number | null | undefined) => ({
    label,
    cells: tiers.map((tier) => formatCount(read(tier))),
  });

  const gateRow = (label: string, read: (tier: PricingTier) => boolean) => ({
    label,
    cells: tiers.map((tier) => read(tier) || null),
  });

  return [
    {
      title: "Limits",
      rows: [
        limitRow("Teams", (t) => f(t)?.team?.count?.max),
        limitRow("Users", (t) => f(t)?.team?.teamMember?.count?.max),
        limitRow("Conversations / month", (t) => f(t)?.whatsapp?.conversation?.count?.max),
        limitRow("Form submissions / month", (t) => f(t)?.webSurvey?.count?.monthlyResponseLimit),
      ],
    },
    {
      title: "Channels, automation & commerce",
      rows: [
        gateRow("WhatsApp · Instagram · Messenger inbox", (t) => Boolean(f(t)?.whatsapp?.active)),
        gateRow("Automations, templates, flows, chatbots", (t) => Boolean(f(t)?.whatsapp?.active)),
        gateRow("Feedback & web surveys", (t) => Boolean(f(t)?.webSurvey?.active)),
        gateRow("Campaigns", (t) => whatsappGate(f(t), "campaign")),
        gateRow("Loyalty & referral programs", (t) => whatsappGate(f(t), "loyalty")),
        gateRow("Shopify integration", (t) => whatsappGate(f(t), "catalog")),
        gateRow("WhatsApp catalog integration", (t) => whatsappGate(f(t), "catalog")),
        gateRow("Meta Business Agent (AI)", (t) => Boolean(f(t)?.ai?.active)),
      ],
    },
    {
      title: "Support",
      rows: [
        {
          label: "Support channel",
          // Support level is a display-only plan attribute with no enforcement behind
          // it, so it is read from the plan's own description bullets.
          cells: tiers.map(
            (tier) =>
              tier.features
                .find((line) => /support|manager/i.test(line))
                ?.replace(/ support$/i, "") ?? "—",
          ),
        },
      ],
    },
  ];
}

/**
 * The gateway plan that charges the visitor's chosen currency at the chosen cadence.
 *
 * A Razorpay plan carries one currency, so the toggle above the cards does not only
 * change a label — it selects which plan the checkout is created from. Falling back to the
 * rupee plan keeps a legacy tier with no dollar counterpart purchasable rather than dead.
 */
export function selectGatewayPlan(
  tier: PricingTier,
  period: "monthly" | "yearly",
  currency: PricingCurrency,
) {
  if (currency === "USD") {
    const usd = period === "yearly" ? tier.usdYearlyPaymentPlan : tier.usdMonthlyPaymentPlan;
    if (usd) return usd;
  }
  return (
    (period === "yearly" ? tier.yearlyPaymentPlan : tier.monthlyPaymentPlan) ?? tier.paymentPlan
  );
}

/**
 * The price to show for a tier in the visitor's chosen currency, or null if it has none.
 *
 * Both currencies are list prices the catalog sets, and the checkout is created from the
 * gateway plan in that same currency — so what is shown is what is charged. There is
 * deliberately no conversion: a tier priced only in rupees reads "Custom" in dollars
 * rather than quoting a figure derived at a fixed rate, which would drift from the real
 * price the moment either currency was adjusted and could never be charged anyway.
 */
export function resolveDisplayPrice(tier: PricingTier, currency: PricingCurrency) {
  if (currency === "USD") return tier.usdPrice;
  return tier.price;
}

/** The catalog name of the conversation top-up, matching the API's `CONVERSATION_ADDON`. */
export const CONVERSATION_PACK_NAME = "CONVERSATION PACK";

/**
 * How long one pack counts for. The API decides this for a real purchase
 * (`ConversationAddonOffer.validDays`); the public plans endpoint carries no such field,
 * so the marketing page states the catalog's standard term.
 */
export const CONVERSATION_PACK_DAYS = 30;

export interface ConversationPack {
  /** Extra conversations one pack is worth. */
  conversations: number;
  inrPrice: number | null;
  usdPrice: number | null;
}

/**
 * The conversation pack as the catalog prices it, or null when it is not on sale.
 *
 * Deliberately read off the plans endpoint rather than written into the copy: the pack's
 * price is set in the catalog and changing it there must change what the page says, or
 * the FAQ ends up quoting a figure nobody is charged.
 */
export function resolveConversationPack(
  plans: RateupPaymentPlan[] | undefined,
): ConversationPack | null {
  const pack = (plans ?? []).find((plan) => plan.name === CONVERSATION_PACK_NAME);
  if (!pack) return null;

  const conversations = pack.features?.whatsapp?.conversation?.count?.max;
  if (!conversations) return null;

  return {
    conversations,
    inrPrice: num(pack.monthlyPrice) ?? null,
    usdPrice: num(pack.usdMonthlyPrice) ?? null,
  };
}

/**
 * The answer to "what if I run out of conversations?", built from the live catalog.
 *
 * Shared by the rendered FAQ and the page's FAQ structured data, so a search engine can
 * never show an answer the page itself contradicts.
 */
export function conversationPackAnswer(pack: ConversationPack | null): string {
  const base =
    "Your allowance is a monthly cap, not a hard ceiling on your account — you can top it " +
    "up without moving up a tier.";
  if (!pack) {
    return `${base} Conversation packs add extra conversations for a month at a time, and stack, so you only pay for the headroom you actually need.`;
  }

  const conversations = pack.conversations.toLocaleString("en-US");
  const price = [
    pack.inrPrice === null ? null : formatPrice("INR", pack.inrPrice),
    pack.usdPrice === null ? null : formatPrice("USD", pack.usdPrice),
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    `${base} A conversation pack adds ${conversations} extra conversations for ` +
    `${CONVERSATION_PACK_DAYS} days` +
    `${price ? ` and costs ${price}` : ""} — a one-off charge, not a subscription, so ` +
    "nothing renews and there is nothing to cancel. Packs stack, so buy as many as you " +
    "need. Packs top up a paid plan: on Free the better move is to upgrade, which raises " +
    "every limit rather than conversations alone, and Enterprise is invoiced on the usage " +
    "it actually runs, so it has no cap to top up."
  );
}

/** The pack's list price in the currency on screen, or null when it is not priced in it. */
export function conversationPackPrice(pack: ConversationPack, currency: PricingCurrency) {
  return currency === "USD" ? pack.usdPrice : pack.inrPrice;
}

/**
 * The conversations a tier includes each month, or null when it has no cap at all.
 *
 * Null is "nothing to top up" rather than "none included": Enterprise carries the
 * unlimited sentinel and is invoiced on the usage it actually runs.
 */
export function tierConversationAllowance(tier: PricingTier): number | null {
  const max = tier.raw.features?.whatsapp?.conversation?.count?.max;
  if (typeof max !== "number" || isUnlimitedCount(max)) return null;
  return max;
}

export interface TopUpEstimate {
  /** Conversations beyond what the plan includes. */
  overage: number;
  /** Packs that cover the overage — the last one is only partly used. */
  packs: number;
  /** Conversations those packs add. */
  extraConversations: number;
  /** Plan allowance plus the packs. */
  totalConversations: number;
}

/**
 * How many packs a month of `expected` conversations needs on top of `included`.
 *
 * Packs are indivisible, so the count rounds up — half a pack of headroom is still a
 * whole pack to buy, and quoting a fractional cost would understate the charge.
 */
export function estimateTopUp(
  included: number,
  expected: number,
  conversationsPerPack: number,
): TopUpEstimate {
  const overage = Math.max(0, Math.ceil(expected) - included);
  const packs =
    conversationsPerPack > 0 && overage > 0 ? Math.ceil(overage / conversationsPerPack) : 0;
  const extraConversations = packs * conversationsPerPack;
  return {
    overage,
    packs,
    extraConversations,
    totalConversations: included + extraConversations,
  };
}

/** A plan the credits calculator can price, reduced to what the advice needs. */
export interface TopUpOption {
  planName: string;
  name: string;
  included: number;
  /** Effective price per month in the currency on screen, or null when unpriced there. */
  monthlyPrice: number | null;
}

/**
 * What to tell someone whose packs are adding up.
 *
 * `upgrade` when a bigger tier includes the whole volume for no more than the plan plus
 * packs costs; `sales` when no tier on the page covers it at all.
 */
export type TopUpAdvice =
  | { kind: "none" }
  | { kind: "upgrade"; option: TopUpOption; monthlySaving: number }
  | { kind: "sales" };

/**
 * Whether stacking packs has stopped being the cheaper answer.
 *
 * Both sides are compared per month, which is the honest comparison only for volume that
 * recurs — a pack is a one-off, so a one-off spike is still cheaper topped up, and the
 * copy has to say "every month" for the advice to be true. Tiers are ranked by the
 * allowance they include rather than by catalog order, so a legacy plan with no rank
 * still gets advice instead of silently getting none.
 */
export function adviseOnTopUp({
  options,
  currentIncluded,
  volume,
  packs,
  monthlyCostWithPacks,
}: {
  options: TopUpOption[];
  currentIncluded: number;
  volume: number;
  packs: number;
  monthlyCostWithPacks: number | null;
}): TopUpAdvice {
  if (packs <= 0) return { kind: "none" };

  const largest = options.reduce((max, option) => Math.max(max, option.included), 0);
  // Past every allowance the page sells, more packs is not the answer to give.
  if (volume > largest) return { kind: "sales" };

  const covering = options
    .filter((option) => option.included > currentIncluded && option.included >= volume)
    .filter(
      (option): option is TopUpOption & { monthlyPrice: number } => option.monthlyPrice !== null,
    )
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice);

  const best = covering[0];
  if (!best || monthlyCostWithPacks === null || best.monthlyPrice > monthlyCostWithPacks) {
    return { kind: "none" };
  }
  return { kind: "upgrade", option: best, monthlySaving: monthlyCostWithPacks - best.monthlyPrice };
}
