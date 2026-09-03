import prisma from "../../utils/prisma.js";
import { CONVERSATION_ADDON } from "./catalog.js";
import { isGatewayBilledPlan } from "./planBilling.js";
import { isUnlimitedAllowance } from "./subscription.data.js";

/** How long one purchased pack counts for. A pack is a month's top-up, bought once. */
export const ADDON_VALID_DAYS = 30;

/** When a pack bought now stops counting. */
export function addonExpiryFrom(purchasedAt: Date): Date {
  const expiry = new Date(purchasedAt);
  expiry.setDate(expiry.getDate() + ADDON_VALID_DAYS);
  return expiry;
}

/** The org's packs that have not run out yet, newest first. */
function activePacks(orgId: string, now: Date) {
  return prisma.subscriptionAddon.findMany({
    where: { orgId, expiresAt: { gt: now }, addon: { name: CONVERSATION_ADDON.name } },
    select: { quantity: true, expiresAt: true },
    orderBy: { expiresAt: "desc" },
  });
}

/**
 * The conversation allowance an org actually has: its plan's, plus any packs still in date.
 *
 * One place computes this, because three call sites depend on it agreeing — the send gate
 * that refuses a message, the alert that says the limit is reached, and the dashboard
 * banner. If they disagreed, a customer would be blocked while being told they had room,
 * or told they had run out while messages kept sending.
 *
 * A pack is a one-off top-up with its own end date rather than a subscription, so an
 * expired pack simply stops being counted — there is no cancellation to process, and
 * nothing renews it.
 *
 * An uncapped plan stays uncapped: adding packs to a sentinel would be meaningless, and
 * Enterprise is invoiced on real usage anyway.
 */
export async function getConversationAllowance(orgId: string): Promise<{
  planMax: number | undefined;
  addonConversations: number;
  /** What to actually meter against. `undefined` means this plan is not metered. */
  effectiveMax: number | undefined;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
    select: { features: true },
  });

  const features = subscription?.features as {
    whatsapp?: { conversation?: { count?: { max?: number } } };
  } | null;
  const planMax = features?.whatsapp?.conversation?.count?.max;

  if (planMax === undefined || planMax <= 0 || isUnlimitedAllowance(planMax)) {
    return { planMax, addonConversations: 0, effectiveMax: undefined };
  }

  const addons = await activePacks(orgId, new Date());

  const packs = addons.reduce((total, addon) => total + addon.quantity, 0);
  const addonConversations = packs * CONVERSATION_ADDON.conversations;

  return { planMax, addonConversations, effectiveMax: planMax + addonConversations };
}

/** The org's own conversation ceiling, when a contract set one. Undefined when uncapped. */
function contractedConversationCap(features: unknown): number | undefined {
  const shape = features as { whatsapp?: { conversation?: { count?: { max?: number } } } } | null;
  const max = shape?.whatsapp?.conversation?.count?.max;
  if (typeof max !== "number" || max <= 0 || isUnlimitedAllowance(max)) return undefined;
  return max;
}

export interface AddonEligibility {
  /** Whether this org may buy conversation packs at all. */
  eligible: boolean;
  /** Why not, in the customer's own terms. Null when they can buy. */
  reason: string | null;
  /** Packs in date right now. */
  packs: number;
  /** When the longest-lived pack runs out, or null when none are held. */
  activeUntil: Date | null;
  conversationsPerPack: number;
  validDays: number;
}

/**
 * Whether an org can buy conversation packs, and how many are in date.
 *
 * A pack tops up an allowance that is actually metered, for one month. Two tiers are
 * excluded, for opposite reasons:
 *
 *   - **Free** is metered, but a pack is not the answer there: it costs a large fraction
 *     of a paid tier and buys only conversations, where upgrading raises every limit and
 *     opens the gated features too. Free customers are told to upgrade.
 *   - **Enterprise** is not metered at all — its allowance is a sentinel and it is
 *     invoiced on the usage it actually runs, so a pack would add nothing to an allowance
 *     that is already uncapped, and be charged for.
 *
 * Both fall out of the same rule the rest of the billing code uses: they are the tiers
 * that link no gateway plan, because neither is sold self-serve at a list price.
 */
export async function getAddonEligibility(orgId: string): Promise<AddonEligibility> {
  const [subscription, held] = await Promise.all([
    prisma.subscription.findUnique({
      where: { orgId },
      select: {
        features: true,
        basePlan: {
          select: {
            name: true,
            displayName: true,
            paymentPlanId: true,
            monthlyPaymentPlanId: true,
            yearlyPaymentPlanId: true,
            stripeId: true,
          },
        },
      },
    }),
    activePacks(orgId, new Date()),
  ]);

  const base = {
    packs: held.reduce((total, row) => total + row.quantity, 0),
    activeUntil: held[0]?.expiresAt ?? null,
    conversationsPerPack: CONVERSATION_ADDON.conversations,
    validDays: ADDON_VALID_DAYS,
  };
  const plan = subscription?.basePlan;

  if (!plan) {
    return { ...base, eligible: false, reason: "This organisation has no plan to top up." };
  }
  if (!isGatewayBilledPlan(plan)) {
    const isFree = plan.name === "FREE PLAN";
    // A contracted account has a real ceiling, so "there is no allowance to top up" would
    // be untrue — the allowance exists, it is just not one a self-serve pack can change.
    const contractedMax = contractedConversationCap(subscription?.features);
    const salesLedReason = contractedMax
      ? `Your agreement includes ${contractedMax.toLocaleString()} conversations a month, ` +
        "and that limit is set by contract rather than sold in packs. Talk to us to raise it."
      : `${plan.displayName ?? plan.name} is invoiced on the usage you actually run, so ` +
        "there is no allowance to top up. Talk to us if you need more headroom.";

    return {
      ...base,
      eligible: false,
      reason: isFree
        ? "Conversation packs top up a paid plan. Upgrading raises every limit, not just " +
          "conversations, and costs little more than a pack."
        : salesLedReason,
    };
  }

  return { ...base, eligible: true, reason: null };
}
