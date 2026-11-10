import prisma from "../../../utils/prisma.js";
import { ADDONS, type AddonKind } from "./catalog.js";
import { isGatewayBilledPlan } from "./planBilling.js";
import { isUnlimitedAllowance } from "./subscription.data.js";

export type { AddonKind } from "./catalog.js";

/** When a pack bought now stops counting. */
export function addonExpiryFrom(kind: AddonKind, purchasedAt: Date): Date {
  const expiry = new Date(purchasedAt);
  expiry.setUTCDate(expiry.getUTCDate() + ADDONS[kind].validDays);
  return expiry;
}

/** The org's packs of one kind that have not run out yet, longest-lived first. */
function activePacks(orgId: string, kind: AddonKind, now: Date) {
  return prisma.subscriptionAddon.findMany({
    where: { orgId, kind, expiresAt: { gt: now } },
    select: { quantity: true, expiresAt: true, creditsGranted: true, creditsUsed: true },
    orderBy: { expiresAt: "desc" },
  });
}

/** The allowance paths in the features blob, one per meter. */
const FEATURE_PATH: Record<AddonKind, "activeContacts" | "campaignCredits"> = {
  ACTIVE_CONTACTS: "activeContacts",
  CAMPAIGN_CREDITS: "campaignCredits",
};

/** The plan's own monthly figure for a meter. Undefined when the plan does not cap it. */
export function planMeterMax(features: unknown, kind: AddonKind): number | undefined {
  const whatsapp = (features as { whatsapp?: Record<string, { count?: { max?: number } }> } | null)
    ?.whatsapp;
  const max = whatsapp?.[FEATURE_PATH[kind]]?.count?.max;
  if (typeof max !== "number" || max <= 0 || isUnlimitedAllowance(max)) return undefined;
  return max;
}

/**
 * The active-contact allowance an org actually has: its plan's, plus contact packs still
 * in date. `effectiveMax` undefined means the plan is not metered (uncapped Enterprise).
 */
export async function getActiveContactAllowance(orgId: string): Promise<{
  planMax: number | undefined;
  addonContacts: number;
  effectiveMax: number | undefined;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
    select: { features: true },
  });
  const planMax = planMeterMax(subscription?.features, "ACTIVE_CONTACTS");
  if (planMax === undefined) return { planMax, addonContacts: 0, effectiveMax: undefined };

  const packs = await activePacks(orgId, "ACTIVE_CONTACTS", new Date());
  const addonContacts =
    packs.reduce((total, pack) => total + pack.quantity, 0) * ADDONS.ACTIVE_CONTACTS.units;

  return { planMax, addonContacts, effectiveMax: planMax + addonContacts };
}

/** Unspent credits across the org's in-date campaign credit packs. */
export async function getCampaignPackCreditsRemaining(orgId: string): Promise<number> {
  const packs = await activePacks(orgId, "CAMPAIGN_CREDITS", new Date());
  return packs.reduce(
    (total, pack) => total + Math.max((pack.creditsGranted ?? 0) - pack.creditsUsed, 0),
    0,
  );
}

export interface AddonEligibility {
  kind: AddonKind;
  /** Whether this org may buy this kind of pack at all. */
  eligible: boolean;
  /** Why not, in the customer's own terms. Null when they can buy. */
  reason: string | null;
  /** Packs in date right now. */
  packs: number;
  /** When the longest-lived pack runs out, or null when none are held. */
  activeUntil: Date | null;
  unitsPerPack: number;
  validDays: number;
}

const NOUN: Record<AddonKind, string> = {
  ACTIVE_CONTACTS: "active contacts",
  CAMPAIGN_CREDITS: "campaign messages",
};

/**
 * Whether an org can buy a kind of pack, and how many are in date.
 *
 * Packs top up a paid, self-serve plan. Free is told to upgrade (it raises every limit for
 * little more than a pack), and a sales-led account's ceiling is set by its contract.
 * Both are the tiers that link no gateway plan.
 */
export async function getAddonEligibility(
  orgId: string,
  kind: AddonKind,
): Promise<AddonEligibility> {
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
    activePacks(orgId, kind, new Date()),
  ]);

  const base = {
    kind,
    packs: held.reduce((total, row) => total + row.quantity, 0),
    activeUntil: held[0]?.expiresAt ?? null,
    unitsPerPack: ADDONS[kind].units,
    validDays: ADDONS[kind].validDays,
  };
  const plan = subscription?.basePlan;

  if (!plan) {
    return { ...base, eligible: false, reason: "This organisation has no plan to top up." };
  }
  if (!isGatewayBilledPlan(plan)) {
    if (plan.name === "FREE PLAN") {
      return {
        ...base,
        eligible: false,
        reason:
          "Packs top up a paid plan. Upgrading raises every limit and costs little more than a pack.",
      };
    }
    const contractedMax = planMeterMax(subscription?.features, kind);
    return {
      ...base,
      eligible: false,
      reason: contractedMax
        ? `Your agreement includes ${contractedMax.toLocaleString()} ${NOUN[kind]} a month, ` +
          "set by contract rather than sold in packs. Talk to us to raise it."
        : `${plan.displayName ?? plan.name} has no ${NOUN[kind]} limit to top up. ` +
          "Talk to us if you need anything changed.",
    };
  }

  return { ...base, eligible: true, reason: null };
}
