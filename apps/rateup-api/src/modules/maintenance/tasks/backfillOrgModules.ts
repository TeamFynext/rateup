import prisma from "../../../utils/prisma.js";
import { IntegratedApps } from "../../../types/enums.js";
import { ORG_MODULES, type OrgModule } from "../../org/modules.js";
import type { TaskContext, TaskOutcome } from "../task.js";

const orgIds = (rows: { orgId: string | null }[]) =>
  new Set(rows.flatMap((row) => (row.orgId ? [row.orgId] : [])));

/**
 * Chooses the visible features for every org that has never chosen them: each feature the
 * org has data in stays, the rest are hidden. Pipeline always stays — every org has a Leads
 * board, so "has data" says nothing there. Only touches orgs with no `modulesChosenAt`, so
 * re-running never overrides an admin's choice.
 */
export async function backfillOrgModules({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const orgs = await prisma.org.findMany({
    where: { modulesChosenAt: null },
    select: { id: true, name: true },
  });

  const [loyalty, webForms, catalogs, orders, shopify, qrCodes, linkPages, agents] =
    await Promise.all([
      prisma.loyaltyProgram.findMany({ select: { orgId: true } }),
      prisma.survey.findMany({
        where: { type: "web" },
        select: { orgId: true },
        distinct: ["orgId"],
      }),
      prisma.whatsappCatalog.findMany({ select: { orgId: true }, distinct: ["orgId"] }),
      prisma.order.findMany({ select: { orgId: true }, distinct: ["orgId"] }),
      prisma.integration.findMany({
        where: { name: IntegratedApps.shopify, active: true },
        select: { orgId: true },
        distinct: ["orgId"],
      }),
      prisma.generateQr.findMany({ select: { ownerOrgId: true }, distinct: ["ownerOrgId"] }),
      prisma.linktree.findMany({ select: { ownerOrgId: true }, distinct: ["ownerOrgId"] }),
      prisma.metaBusinessAgent.findMany({ select: { orgId: true }, distinct: ["orgId"] }),
    ]);

  const inUse: Record<OrgModule, Set<string> | null> = {
    pipeline: null,
    loyalty: orgIds(loyalty),
    commerce: new Set([...orgIds(catalogs), ...orgIds(orders), ...orgIds(shopify)]),
    web_forms: orgIds(webForms),
    qr_links: new Set([...qrCodes, ...linkPages].map((row) => row.ownerOrgId)),
    ai_agent: orgIds(agents),
  };

  const hiddenCounts = Object.fromEntries(ORG_MODULES.map((module) => [module, 0]));
  const now = new Date();
  for (const org of orgs) {
    const hiddenModules = ORG_MODULES.filter((module) => {
      const users = inUse[module];
      return users !== null && !users.has(org.id);
    });
    for (const module of hiddenModules) hiddenCounts[module]++;
    if (apply) {
      await prisma.org.update({
        where: { id: org.id },
        data: { hiddenModules, modulesChosenAt: now },
      });
    }
  }

  log(`${orgs.length} orgs had not chosen their features.`);
  for (const [module, count] of Object.entries(hiddenCounts)) {
    log(`${module}: ${apply ? "hidden" : "would hide"} for ${count} orgs`);
  }

  return {
    summary: `${apply ? "Chose" : "Would choose"} features for ${orgs.length} orgs`,
    details: { orgs: orgs.length, hidden: hiddenCounts },
  };
}
