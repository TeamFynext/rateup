import prisma from "../../../utils/prisma.js";
import { FREE_MONTHLY_ORDERS } from "../../subscription/subscription.data.js";
import type { TaskContext, TaskOutcome } from "../task.js";

const withOrderCap = (features: LegacySubscriptionFeatures | null): LegacySubscriptionFeatures => {
  const f = features ?? {};
  return {
    ...f,
    whatsapp: {
      ...f.whatsapp,
      shopOrders: { active: true, count: { max: FREE_MONTHLY_ORDERS } },
    },
  };
};

/**
 * Plan features are copied onto each subscription when it is created, so a Free org created
 * before the monthly order cap has no ceiling stored and is unmetered. This writes the cap onto
 * the Free plan row and every subscription on it that lacks one; a positive number already
 * there (set by staff) is left alone. Safe to re-run.
 */
export async function capFreeOrders({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const plan = await prisma.rateupPlan.findFirst({ where: { name: "FREE PLAN" } });
  if (!plan) return { summary: "No FREE PLAN row; nothing to do", details: {} };

  const subscriptions = await prisma.subscription.findMany({
    where: { basePlanId: plan.id },
    select: { orgId: true, features: true },
  });
  // Zero reads as "no ceiling", which a Free org was never meant to have.
  const pending = subscriptions.filter(
    (s) => !((s.features?.whatsapp?.shopOrders?.count?.max ?? 0) > 0),
  );

  if (apply) {
    await prisma.rateupPlan.update({
      where: { id: plan.id },
      data: { features: withOrderCap(plan.features as LegacySubscriptionFeatures | null) },
    });
    for (const s of pending) {
      await prisma.subscription.update({
        where: { orgId: s.orgId },
        data: { features: withOrderCap(s.features) },
      });
    }
  }
  log(
    `${pending.length} of ${subscriptions.length} Free subscriptions ${apply ? "now have" : "would get"} the ${FREE_MONTHLY_ORDERS}-order cap`,
  );
  return {
    summary: `${apply ? "Capped" : "Would cap"} monthly orders for ${pending.length} Free orgs`,
    details: { free: subscriptions.length, updated: pending.length },
  };
}
