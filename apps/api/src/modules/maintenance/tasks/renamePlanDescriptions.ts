import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";

/**
 * Plan description lines whose wording changed in the catalog. Old line → new line.
 * Only lines that match exactly are rewritten, so a description staff edited by hand
 * is left alone.
 */
export const PLAN_DESCRIPTION_RENAMES: Record<string, string> = {
  // 2026-10-30: Chatbots were renamed Journeys.
  "Automations, templates & chatbots": "Automations, templates & journeys",
};

/**
 * `RateupPlan.description` is copied from the catalog only when a tier is seeded, so live
 * rows keep the old wording after the catalog changes. This rewrites the lines listed in
 * PLAN_DESCRIPTION_RENAMES on every plan row. Safe to re-run.
 */
export async function renamePlanDescriptions({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const plans = await prisma.rateupPlan.findMany({
    select: { id: true, name: true, description: true },
  });

  const changed: string[] = [];
  for (const plan of plans) {
    const next = plan.description.map((line) => PLAN_DESCRIPTION_RENAMES[line] ?? line);
    if (next.every((line, i) => line === plan.description[i])) continue;

    changed.push(plan.name);
    plan.description.forEach((line, i) => {
      if (next[i] !== line) log(`${plan.name}: "${line}" → "${next[i]}"`);
    });
    if (apply) {
      await prisma.rateupPlan.update({ where: { id: plan.id }, data: { description: next } });
    }
  }

  if (changed.length === 0) log("Every plan already uses the current wording");
  return {
    summary: `${apply ? "Updated" : "Would update"} ${changed.length} of ${plans.length} plans`,
    details: { plans: plans.length, updated: changed.length, names: changed },
  };
}
