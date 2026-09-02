/**
 * Re-points the stored Razorpay plan ids at the Razorpay account the current
 * RAZORPAY_API_KEY belongs to.
 *
 *
 * Razorpay plan ids are scoped to the account that created them, so swapping keys
 * (test → live, or one merchant account for another) leaves every PaymentPlans.planId
 * pointing at a plan the new account cannot see, and subscription creation fails with
 * BAD_REQUEST_ERROR "The ID provided is invalid or could not be found."
 *
 * For each PaymentPlans row this fetches the plan under the current keys; if it is
 * missing it creates an equivalent plan (same name/amount/period/interval) in the new
 * account and rewrites planId in place. Rows whose plan already resolves are left
 * alone, so this is idempotent and safe to re-run after a partial failure. The row ids
 * never change, so the RateupPlan links stay intact.
 */
import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";
import { RazorpayInstance } from "../../../utils/payment/razorpay.js";

/**
 * Only the current catalog's plans. The account also holds years of one-off plans whose
 * ids are legitimately dead, and re-creating those at Razorpay would be pure noise.
 */
const PREFIX = "RATEUP_";
/** Razorpay rate-limits bursts of reads; one fetch per row with a gap keeps us under it. */
const THROTTLE_MS = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function planExists(planId: string) {
  try {
    await RazorpayInstance.plans.fetch(planId);
    return true;
  } catch (error: any) {
    // Anything other than "not found under this account" is a real failure — a wrong
    // secret or an outage would otherwise look like a stale catalog and get re-created.
    if (error?.statusCode === 400 || error?.statusCode === 404) return false;
    throw error;
  }
}

export async function relinkRazorpayPlans({ apply, log: emit }: TaskContext): Promise<TaskOutcome> {
  const log = (action: string, detail: string) => emit(`${action}: ${detail}`);

  const rows = await prisma.paymentPlans.findMany({
    where: PREFIX ? { name: { startsWith: PREFIX } } : undefined,
    orderBy: { name: "asc" },
  });
  let relinked = 0;

  for (const row of rows) {
    await sleep(THROTTLE_MS);
    if (await planExists(row.planId)) {
      log("ok", `${row.name} (${row.planId})`);
      continue;
    }

    if (!apply) {
      log("would recreate", `${row.name} ₹${row.amount} ${row.period} (stale ${row.planId})`);
      relinked++;
      continue;
    }

    const created: any = await RazorpayInstance.plans.create({
      period: row.period as "monthly" | "yearly",
      interval: row.interval,
      item: { name: row.name, amount: row.amount * 100, currency: row.currency },
    });
    await prisma.paymentPlans.update({
      where: { id: row.id },
      data: { planId: created.id, createdAt: created.created_at },
    });
    log("recreated", `${row.name}: ${row.planId} → ${created.id}`);
    relinked++;
  }

  return {
    summary: `${relinked} of ${rows.length} plan(s) ${apply ? "relinked" : "need relinking"}.`,
    details: { relinked, checked: rows.length },
  };
}
