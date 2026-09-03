import prisma from "../../utils/prisma.js";
import { getConversationAllowance } from "./addons.js";

export interface ConversationBudget {
  /** False when the plan is not metered at all — an uncapped Enterprise contract. */
  metered: boolean;
  /**
   * What the org may spend this period, packs included, already scaled for an annual
   * allowance. Undefined when `metered` is false.
   */
  max?: number;
  /** Metered 24h windows opened so far this period. */
  used: number;
  /** What is left, floored at zero. Undefined when `metered` is false. */
  remaining?: number;
  /** True when the allowance pools annually rather than monthly. */
  isAnnual: boolean;
}

/**
 * What the org has left of its conversation allowance, in the same terms the send gate
 * enforces.
 *
 * One function, because everything that talks about the allowance has to agree: the gate
 * that refuses a message, the campaign preflight that warns before one is sent, the alert
 * that says the limit is reached, and the dashboard meter. A customer told they have room
 * and then refused — or warned about a shortfall that never comes — is the failure this
 * exists to prevent.
 *
 * Counted against the METERED counters (self-derived 24h conversation windows), never the
 * inbox-ticket counters; see checkConversationLimitAvailable.
 */
export async function getConversationBudget(orgId: string): Promise<ConversationBudget> {
  const [usage, subscription, { effectiveMax }] = await Promise.all([
    prisma.usageStats.findUnique({ where: { orgId } }),
    prisma.subscription.findUnique({ where: { orgId }, select: { isAnnualMessageLimit: true } }),
    getConversationAllowance(orgId),
  ]);

  const isAnnual = Boolean(subscription?.isAnnualMessageLimit);

  // No usage row or no subscription: nothing to measure, so nothing is enforced. Matches
  // the send gate, which treats missing bookkeeping as "within limit" rather than
  // refusing a send over data the customer cannot fix.
  if (!usage || !subscription || effectiveMax === undefined) {
    return { metered: false, used: 0, isAnnual };
  }

  // An annual-limit org is measured against twelve months of the monthly allowance — the
  // same arithmetic the gate does.
  const max = isAnnual ? effectiveMax * 12 : effectiveMax;
  const used = isAnnual
    ? usage.annualMeteredConversationsCount
    : usage.monthlyMeteredConversationsCount;

  return { metered: true, max, used, remaining: Math.max(max - used, 0), isAnnual };
}
