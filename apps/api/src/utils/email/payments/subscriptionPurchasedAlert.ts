import { notificationQueue } from "../../../workers/bullmq/queues/index.js";
import prisma from "../../prisma.js";
import { formatDateT1 } from "../../date.js";
import { formatAmountPaid, renderSubscriptionPurchasedEmail } from "../react/templates.js";

export interface SubscriptionPurchasedAlert {
  /** Null when the webhook carried no org; the alert then names the plan alone. */
  orgId: string | null | undefined;
  customerEmail: string | undefined;
  planName: string;
  /** Minor units (paise/cents) as the payment provider reports them. */
  paid?: { amountMinor: number; currency?: string };
  gateway: "Razorpay" | "Stripe";
  cycleEndsAt: Date;
}

/**
 * Tell the RateUp mailbox that a subscription's first payment cleared.
 *
 * This replaced an alert that fired when someone merely *picked* a plan on the pricing
 * page: most of those never paid, so the mailbox filled with prospects while the actual
 * conversions arrived unannounced. Callers must fire this only on a first charge — a
 * renewal is not news, and the customer's own "Subscription Activated" mail is separate
 * from this one.
 *
 * Never throws. Entitlements are already granted by the time this runs, so a queue that
 * is down must not fail the webhook and have the provider retry a charge we have booked.
 */
export async function sendSubscriptionPurchasedAlert({
  orgId,
  customerEmail,
  planName,
  paid,
  gateway,
  cycleEndsAt,
}: SubscriptionPurchasedAlert) {
  try {
    const org = orgId
      ? await prisma.org.findUnique({
          where: { id: orgId },
          select: { name: true, owner: { select: { email: true } } },
        })
      : null;

    // The provider's billing email is the one that actually paid; the owner's address is
    // the fallback for a gateway that reported none.
    const billingEmail = customerEmail ?? org?.owner?.email ?? "—";

    const html = await renderSubscriptionPurchasedEmail({
      orgName: org?.name ?? "An organisation",
      customerEmail: billingEmail,
      planName,
      amountPaid: formatAmountPaid(paid?.amountMinor, paid?.currency),
      gateway,
      billingCycleEndsOn: formatDateT1(cycleEndsAt),
    });

    await notificationQueue.add("notification", {
      emailData: {
        to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
        subject: `ALERT: ${org?.name ?? "An organisation"} subscribed to ${planName}`,
        text: `A subscription payment cleared for the ${planName} plan (${gateway}).`,
        html,
      },
    });
  } catch (error) {
    console.error("Failed to queue the subscription-purchased alert", error);
  }
}
