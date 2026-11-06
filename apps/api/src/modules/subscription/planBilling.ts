import { Prisma } from "../../../generated/prisma/client.js";

/**
 * Plans that a payment gateway bills on a schedule, as opposed to ones a human manages.
 *
 * A tier that links a Razorpay plan or a Stripe product renews (or fails to renew) on its
 * own, so its `expiresAt` is a real deadline. Enterprise and bespoke `custom` tiers link
 * nothing — they are sold and renewed by conversation, and their `expiresAt` is whatever
 * an admin last typed. Letting the expiry sweep touch those would silently strip a
 * contracted customer's features because a date was not extended in time.
 *
 * Free links nothing either, which is why it is excluded here for free.
 */
export const GATEWAY_BILLED_PLAN: Prisma.RateupPlanWhereInput = {
  OR: [
    { paymentPlanId: { not: null } },
    { monthlyPaymentPlanId: { not: null } },
    { yearlyPaymentPlanId: { not: null } },
    { stripeId: { not: null } },
  ],
};

/** The in-memory counterpart of {@link GATEWAY_BILLED_PLAN}, for an already-loaded row. */
export function isGatewayBilledPlan(
  plan: {
    paymentPlanId: string | null;
    monthlyPaymentPlanId: string | null;
    yearlyPaymentPlanId: string | null;
    stripeId: string | null;
  } | null,
) {
  return Boolean(
    plan?.paymentPlanId ||
    plan?.monthlyPaymentPlanId ||
    plan?.yearlyPaymentPlanId ||
    plan?.stripeId,
  );
}
