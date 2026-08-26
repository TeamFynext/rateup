import { getEnterpriseSubscriptionFeatures } from "../../subscription/subscription.data.js";
import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/** The two-argument log the task bodies use, forwarded to the run's collector. */
type Log = (action: string, detail: string) => void;

/**
 * Moves every existing subscription onto the current catalog by the production rule:
 *
 *   Free stays Free. Everything else becomes Enterprise.
 *
 * Blunt on purpose. The alternative — mapping each org onto the cheapest new tier that
 * covers what it holds today — reprices live customers as a side effect of a data
 * migration, and gets it wrong for anyone on a legacy plan whose name no longer describes
 * what they actually have. Enterprise is unlimited and invoiced on real usage, so nobody
 * loses capability and nobody is silently moved onto a price they did not agree to. Which
 * tier each account really belongs on is then a conversation, not a guess.
 *
 * Orgs already on FREE PLAN are deliberately left untouched: their legacy allowances may
 * exceed today's Free, so leaving them means nobody loses anything in a migration that was
 * not about them.
 *
 * A subscription with no plan at all is converted like any other. Enterprise is not a
 * price — it is unlimited features invoiced on real usage — so the risk of adopting a row
 * whose `basePlanId` is null is that someone gets more than they had, not that they are
 * charged for something they did not agree to. The alternative is worse: an unplanned row
 * is invisible to every plan-keyed path in the app (add-on eligibility, the expiry sweep,
 * `refresh-plan-features`, the admin plan joins), so leaving it alone leaves it broken.
 * They are still counted separately in the transcript, so the run says how many arrived
 * with no plan.
 *
 * A live gateway subscription is **not** cancelled. An org moved to Enterprise that still
 * has one keeps being charged by Razorpay, which is the opposite of "invoiced on usage" —
 * so those are called out individually for someone to deal with deliberately.
 */
export async function convertSubscriptions({
  apply,
  log: emit,
}: TaskContext): Promise<TaskOutcome> {
  const log: Log = (action, detail) => emit(`${action}: ${detail}`);

  const enterprise = await prisma.rateupPlan.findFirst({ where: { name: "ENTERPRISE PLAN" } });
  if (!enterprise) {
    throw new Error("No ENTERPRISE PLAN in the catalog. Seed the plan catalog first.");
  }

  const subscriptions = await prisma.subscription.findMany({
    select: {
      orgId: true,
      basePlanId: true,
      subscriptionRef: true,
      basePlan: { select: { name: true } },
    },
  });

  const features = getEnterpriseSubscriptionFeatures();
  let converted = 0;
  let leftOnFree = 0;
  let unplanned = 0;
  const stillBilling: string[] = [];

  for (const subscription of subscriptions) {
    const planName = subscription.basePlan?.name;

    // A null `basePlanId` and a plan row that somehow has no name are the same case: the
    // subscription does not name a tier, so there is nothing to match on below.
    const hasNoPlan = !subscription.basePlanId || !planName;

    if (planName === "FREE PLAN") {
      leftOnFree++;
      continue;
    }

    if (planName === "ENTERPRISE PLAN") {
      // Already where the rule wants it; rewriting would only churn the features blob.
      continue;
    }

    if (hasNoPlan) unplanned++;

    if (subscription.subscriptionRef?.startsWith("sub_")) {
      stillBilling.push(subscription.orgId);
      log(
        "still billing",
        `${subscription.orgId} — Razorpay ${subscription.subscriptionRef} is live and is NOT cancelled by this task`,
      );
    }

    log(subscription.orgId, `${hasNoPlan ? "no plan" : `"${planName}"`} -> Enterprise`);
    converted++;

    if (!apply) continue;

    await prisma.subscription.update({
      where: { orgId: subscription.orgId },
      data: {
        basePlanId: enterprise.id,
        features: features as never,
        // Enterprise is sold and renewed by conversation, and the expiry sweep exempts it,
        // so a date here means nothing. A far-future one keeps `checkExpiry` from showing
        // a contracted account as expired mid-migration.
        expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
        lastLimitAlertSentAt: null,
      },
    });
  }

  log("free", `${leftOnFree} org(s) left on Free`);
  if (unplanned > 0) {
    log("no plan", `${unplanned} of those org(s) arrived with no plan at all`);
  }
  if (stillBilling.length > 0) {
    log(
      "action needed",
      `${stillBilling.length} converted org(s) still have a live Razorpay subscription — cancel them or they keep being charged`,
    );
  }

  return {
    summary:
      `${apply ? "Moved" : "Would move"} ${converted} org(s) to Enterprise; ` +
      `${leftOnFree} left on Free` +
      (stillBilling.length > 0 ? `; ${stillBilling.length} still billing via Razorpay` : "."),
    details: { converted, leftOnFree, unplanned, stillBilling },
  };
}
