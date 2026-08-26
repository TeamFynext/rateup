import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * Deletes the stray `custom` catalog tier, which duplicated ENTERPRISE PLAN.
 *
 * Both were sales-led (no gateway plan of any kind), so they described the same product:
 * a tier sold by conversation. ENTERPRISE PLAN is the one the seeded catalog and the
 * pricing page know about; `custom` predated it.
 *
 * Refuses while anything still points at the row. A subscription or order holding the
 * foreign key would either block the delete or need re-pointing, and that is a migration
 * decision rather than something a cleanup should take on itself.
 */
export async function removeCustomPlan({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const plan = await prisma.rateupPlan.findFirst({ where: { name: "custom" } });
  if (!plan) {
    return { summary: "No `custom` tier in the catalog — nothing to do." };
  }

  const [subscriptions, orders] = await Promise.all([
    prisma.subscription.count({ where: { basePlanId: plan.id } }),
    prisma.order.count({ where: { rateupPlanId: plan.id } }),
  ]);

  if (subscriptions > 0 || orders > 0) {
    throw new Error(
      `Refusing to delete: ${subscriptions} subscription(s) and ${orders} order(s) still ` +
        "reference it. Move them onto ENTERPRISE PLAN first, then re-run.",
    );
  }

  if (!apply) {
    log(`would delete the \`custom\` tier (${plan.id}); nothing references it`);
    return { summary: "Would delete the `custom` tier.", details: { planId: plan.id } };
  }

  await prisma.rateupPlan.delete({ where: { id: plan.id } });
  log(`deleted the \`custom\` tier (${plan.id})`);
  return { summary: "Deleted the `custom` tier.", details: { planId: plan.id } };
}
