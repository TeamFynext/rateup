import prisma from "../../utils/prisma.js";

/**
 * Product areas an org can switch off. Off only hides the area in the clients' navigation;
 * routes, crons and data keep working. Mirrored in rateup-ui `src/utils/modules.ts` and
 * rateup-app `src/utils/modules.ts`.
 */
export const ORG_MODULES = [
  "pipeline",
  "loyalty",
  "commerce",
  "web_forms",
  "qr_links",
  "ai_agent",
] as const;

export type OrgModule = (typeof ORG_MODULES)[number];

/** Shown to every new org whatever it picked at signup. */
const ALWAYS_SHOWN_AT_SIGNUP: readonly OrgModule[] = ["pipeline"];

/** Signup goal ids (rateup-ui `components/Form/signup/Step3.tsx`) that call for a module. */
const GOAL_MODULES: Record<string, OrgModule> = {
  "loyalty-program": "loyalty",
  "web-feedback-forms": "web_forms",
};

export function hiddenModulesForGoals(goals: readonly string[]): OrgModule[] {
  const wanted = new Set<OrgModule>(ALWAYS_SHOWN_AT_SIGNUP);
  for (const goal of goals) {
    const module = GOAL_MODULES[goal];
    if (module) wanted.add(module);
  }
  return ORG_MODULES.filter((module) => !wanted.has(module));
}

export async function setHiddenModules(orgId: string, hiddenModules: readonly OrgModule[]) {
  const org = await prisma.org.update({
    where: { id: orgId },
    data: { hiddenModules: [...new Set(hiddenModules)], modulesChosenAt: new Date() },
    select: { hiddenModules: true },
  });
  return org.hiddenModules;
}
