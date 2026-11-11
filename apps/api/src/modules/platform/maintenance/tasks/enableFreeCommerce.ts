import prisma from "../../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

const withCatalog = (features: LegacySubscriptionFeatures | null): LegacySubscriptionFeatures => {
  const f = features ?? {};
  return { ...f, whatsapp: { ...f.whatsapp, catalog: { ...f.whatsapp?.catalog, active: true } } };
};

/**
 * Free plan features are copied onto each subscription when it is created, so turning
 * Commerce on for Free only reaches new orgs. This turns it on for the Free plan row and for
 * every subscription on it. Safe to re-run.
 */
export async function enableFreeCommerce({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const plan = await prisma.rateupPlan.findFirst({ where: { name: "FREE PLAN" } });
  if (!plan) return { summary: "No FREE PLAN row; nothing to do", details: {} };

  const subscriptions = await prisma.subscription.findMany({
    where: { basePlanId: plan.id },
    select: { orgId: true, features: true },
  });
  const pending = subscriptions.filter((s) => s.features?.whatsapp?.catalog?.active !== true);

  if (apply) {
    await prisma.rateupPlan.update({
      where: { id: plan.id },
      data: { features: withCatalog(plan.features as LegacySubscriptionFeatures | null) },
    });
    for (const s of pending) {
      await prisma.subscription.update({
        where: { orgId: s.orgId },
        data: { features: withCatalog(s.features) },
      });
    }
  }
  log(
    `${pending.length} of ${subscriptions.length} Free subscriptions ${apply ? "now have" : "would get"} Commerce`,
  );
  return {
    summary: `${apply ? "Enabled" : "Would enable"} Commerce for ${pending.length} Free orgs`,
    details: { free: subscriptions.length, updated: pending.length },
  };
}
