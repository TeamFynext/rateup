import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";
import { buildStageLookup, resolveStage, type StoredMapping } from "./stageLookup.js";

/**
 * Writes a `stageId` next to every stored `lifecycleId` — in the Zoho mapping tables and
 * in automation-rule actions.
 *
 * **Additive on purpose, and this is a deliberate exception to "replace, don't
 * dual-write".** That rule is about code surfaces, where the switch happens in one change.
 * Here the data has to move *before* the code that reads it does, so for the window in
 * between both keys must be present or live Zoho syncing and live rules break the moment
 * this runs. The lifecycle keys are stripped in a later pass, once nothing reads them.
 *
 * What it cannot migrate, and why:
 *
 * - **`RuleCondition` (`CONTACT_LIFECYCLE`)** stores the lifecycle id in a plain `String`
 *   column with nowhere to put a second value, and the condition's `field` has to change
 *   to `CONTACT_STAGE` at the same time. That is a code change, not a data one. The count
 *   is reported so the work stays visible.
 * - **Rules triggered by `LIFECYCLE_UPDATED`** need a new `TriggerEvent` enum value before
 *   they can move. Also reported, not touched.
 */
export async function mapLifecycleRefsToStages({ apply, log }: TaskContext): Promise<TaskOutcome> {
  const details = {
    orgsWithBoard: 0,
    zohoIntegrations: 0,
    biginMappings: 0,
    biginMapped: 0,
    crmMappings: 0,
    crmMapped: 0,
    ruleActions: 0,
    ruleActionsMapped: 0,
    /** Rows that already name a live column — nothing to do, not a problem. */
    alreadyMapped: 0,
    unresolved: 0,
    /** Reported only — these need a code change, not a data one. */
    ruleConditionsNeedingWork: 0,
    lifecycleTriggeredRules: 0,
  };

  const pipelines = await prisma.pipeline.findMany({
    orderBy: { order: "asc" },
    select: { orgId: true, stages: { select: { id: true, name: true } } },
  });

  const lookupByOrg = new Map<string, ReturnType<typeof buildStageLookup>>();
  for (const pipeline of pipelines) {
    if (lookupByOrg.has(pipeline.orgId)) continue;
    const lifecycles = await prisma.lifecycle.findMany({
      where: { orgId: pipeline.orgId },
      select: { id: true, name: true },
    });
    lookupByOrg.set(pipeline.orgId, buildStageLookup(lifecycles, pipeline.stages));
  }
  details.orgsWithBoard = lookupByOrg.size;
  log(`${details.orgsWithBoard} org(s) have a board to map onto`);

  /**
   * Stamps `stageId`/`stageName` onto one stored mapping row.
   *
   * A row configured through the current UI already names a column and carries no
   * lifecycle at all. That is finished work, not a failure — counting it as unresolved
   * made a healthy integration look broken and buried the rows that genuinely could not be
   * matched.
   */
  const stamp = (row: StoredMapping, lookup: ReturnType<typeof buildStageLookup>) => {
    if (row.stageId) {
      details.alreadyMapped++;
      return false;
    }

    const hit = resolveStage(lookup, row.lifecycleId, row.lifecycleName);
    if (!hit) {
      details.unresolved++;
      return false;
    }
    row.stageId = hit.stageId;
    row.stageName = hit.stageName;
    return true;
  };

  // ---- Zoho ---------------------------------------------------------------
  const integrations = await prisma.integration.findMany({
    where: { name: { contains: "zoho", mode: "insensitive" }, orgId: { not: null } },
    select: { id: true, orgId: true, credential: true },
  });

  for (const integration of integrations) {
    const lookup = integration.orgId ? lookupByOrg.get(integration.orgId) : undefined;
    if (!lookup) continue;
    details.zohoIntegrations++;

    // Cloned so a dry run cannot mutate anything that later gets written.
    const credential = structuredClone(integration.credential) as Record<string, unknown>;
    let touched = false;

    const bigin = (credential.bigin as { pipeline?: { lifecycleStageMappings?: StoredMapping[] } })
      ?.pipeline?.lifecycleStageMappings;
    if (Array.isArray(bigin)) {
      details.biginMappings += bigin.length;
      for (const row of bigin) {
        if (stamp(row, lookup)) {
          details.biginMapped++;
          touched = true;
        }
      }
    }

    const crm = (credential.crm as { leadLifecycleMappings?: StoredMapping[] })
      ?.leadLifecycleMappings;
    if (Array.isArray(crm)) {
      details.crmMappings += crm.length;
      for (const row of crm) {
        if (stamp(row, lookup)) {
          details.crmMapped++;
          touched = true;
        }
      }
    }

    if (apply && touched) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { credential: credential as Prisma.InputJsonValue },
      });
    }
  }

  log(
    `Zoho: ${details.biginMapped} Bigin and ${details.crmMapped} CRM mapping(s) across ${details.zohoIntegrations} integration(s)`,
  );

  // ---- Automation rule actions --------------------------------------------
  const actions = await prisma.ruleAction.findMany({
    where: { type: "ASSIGN_LIFECYCLE" },
    select: { id: true, value: true, rule: { select: { orgId: true } } },
  });

  for (const action of actions) {
    const lookup = lookupByOrg.get(action.rule.orgId);
    if (!lookup) continue;
    details.ruleActions++;

    // The value is either a bare lifecycle id from before the pipeline option existed, or
    // an object. Both become an object so there is room for the stage id;
    // `readAssignLifecycleValue` already reads either shape.
    const raw = action.value;
    const row: StoredMapping =
      typeof raw === "string" ? { lifecycleId: raw } : { ...(raw as Record<string, unknown>) };

    if (!stamp(row, lookup)) continue;
    details.ruleActionsMapped++;

    if (apply) {
      await prisma.ruleAction.update({
        where: { id: action.id },
        data: { value: row as Prisma.InputJsonValue },
      });
    }
  }

  log(`rules: ${details.ruleActionsMapped} of ${details.ruleActions} Assign Lifecycle action(s)`);

  // ---- Reported only -------------------------------------------------------
  details.ruleConditionsNeedingWork = await prisma.ruleCondition.count({
    where: { field: "CONTACT_LIFECYCLE" },
  });
  details.lifecycleTriggeredRules = await prisma.rule.count({
    where: { triggerEvent: "LIFECYCLE_UPDATED" },
  });

  if (details.ruleConditionsNeedingWork || details.lifecycleTriggeredRules) {
    log(
      `needs a code change, not touched: ${details.ruleConditionsNeedingWork} lifecycle condition(s), ${details.lifecycleTriggeredRules} lifecycle-triggered rule(s)`,
    );
  }
  if (details.unresolved) {
    log(`${details.unresolved} row(s) name a lifecycle with no column of that name`);
  }

  const mapped = details.biginMapped + details.crmMapped + details.ruleActionsMapped;
  const verb = apply ? "Mapped" : "Would map";
  return { summary: `${verb} ${mapped} stored reference(s) onto stages.`, details };
}
