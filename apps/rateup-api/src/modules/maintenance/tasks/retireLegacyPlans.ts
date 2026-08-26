/**
 * Retires everything outside the five-tier catalog.
 *
 *
 * Two different jobs, deliberately treated differently:
 *
 *   - **Gateway plans** (`PaymentPlans`) are *disabled*, never deleted. Orders and
 *     invoices from years of retired plans still name them, and a subscription that
 *     somehow survives on one must keep billing at the amount it agreed to. Marking them
 *     INACTIVE takes them out of the catalog without rewriting history.
 *   - **Tiers** (`RateupPlan`) are *deleted*, but only when nothing points at them. A tier
 *     is a sellable product; a disabled one has nowhere to live, since the model carries
 *     no status column. Anything still referenced is reported and left alone — moving a
 *     live subscription is a migration decision, not a cleanup.
 *
 * Idempotent: a second run finds nothing left to do.
 */
import { PaymentPlanStatus } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/** The two-argument log the task bodies use, forwarded to the run's collector. */
type Log = (action: string, detail: string) => void;

/** The tiers that are actually for sale. Everything else is history. */
const CATALOG = ["FREE PLAN", "PLUS PLAN", "PRO PLAN", "MAX PLAN", "ENTERPRISE PLAN"];

async function retireGatewayPlans(apply: boolean, log: Log) {
  const catalog = await prisma.rateupPlan.findMany({
    where: { name: { in: CATALOG } },
    select: { paymentPlanId: true, monthlyPaymentPlanId: true, yearlyPaymentPlanId: true },
  });
  const linked = new Set(
    catalog
      .flatMap((tier) => [tier.paymentPlanId, tier.monthlyPaymentPlanId, tier.yearlyPaymentPlanId])
      .filter((id): id is string => Boolean(id)),
  );

  const stale = await prisma.paymentPlans.findMany({
    where: {
      id: { notIn: [...linked] },
      status: { not: PaymentPlanStatus.INACTIVE },
    },
    select: { id: true, name: true, status: true },
  });

  if (!stale.length) {
    log("gateway plans", "nothing to disable");
    return 0;
  }

  if (!apply) {
    for (const plan of stale) log("would disable", `${plan.name} (was ${plan.status})`);
    return stale.length;
  }

  const { count } = await prisma.paymentPlans.updateMany({
    where: { id: { in: stale.map((plan) => plan.id) } },
    data: { status: PaymentPlanStatus.INACTIVE },
  });
  log("disabled gateway plans", String(count));
  return count;
}

async function retireTiers(apply: boolean, log: Log) {
  const legacy = await prisma.rateupPlan.findMany({ where: { name: { notIn: CATALOG } } });
  if (!legacy.length) {
    log("tiers", "nothing outside the catalog");
    return 0;
  }

  let removed = 0;
  for (const tier of legacy) {
    const [subscriptions, orders] = await Promise.all([
      prisma.subscription.count({ where: { basePlanId: tier.id } }),
      prisma.order.count({ where: { rateupPlanId: tier.id } }),
    ]);

    if (subscriptions > 0 || orders > 0) {
      log(
        "keeping",
        `${tier.name} — ${subscriptions} subscription(s), ${orders} order(s) still reference it`,
      );
      continue;
    }

    if (!apply) {
      log("would delete tier", tier.name);
      removed++;
      continue;
    }

    await prisma.rateupPlan.delete({ where: { id: tier.id } });
    log("deleted tier", tier.name);
    removed++;
  }
  return removed;
}

export async function retireLegacyPlans({ apply, log: emit }: TaskContext): Promise<TaskOutcome> {
  const log = (action: string, detail: string) => emit(`${action}: ${detail}`);

  const disabled = await retireGatewayPlans(apply, log);
  const removed = await retireTiers(apply, log);

  return {
    summary:
      `${apply ? "Disabled" : "Would disable"} ${disabled} gateway plan(s); ` +
      `${apply ? "deleted" : "would delete"} ${removed} tier(s).`,
    details: { disabled, removed },
  };
}
