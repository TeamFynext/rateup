import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import type { TaskContext, TaskOutcome } from "../task.js";
import { buildStageLookup, resolveStage } from "./stageLookup.js";

/**
 * Switches rules already written against **Assign Lifecycle** over to **Assign Stage**, so
 * they move the contact's lead instead of setting a lifecycle.
 *
 * **This changes what those rules do, and it is not a reversible click.** The old action
 * wrote the contact record and fanned out to Zoho, Zapier and the Meta Conversions API;
 * the new one writes only the lead. Until those surfaces move, a converted rule stops
 * updating Zoho. The `lifecycleId` it came from is kept in the stored value so a rule can
 * be put back by hand, but nothing here undoes it in bulk.
 *
 * An action whose lifecycle has no column of that name is left as it is and reported.
 * Converting it would mean guessing a column, and a rule that fires on every inbound
 * message is the worst place to guess.
 */
export async function convertAssignLifecycleActions({
  apply,
  log,
}: TaskContext): Promise<TaskOutcome> {
  const details = {
    actions: 0,
    converted: 0,
    unresolved: 0,
    skippedNoBoard: 0,
    /** Rule names touched, so the operator can go and look at them. */
    rules: [] as string[],
  };

  const actions = await prisma.ruleAction.findMany({
    where: { type: "ASSIGN_LIFECYCLE" },
    select: { id: true, value: true, rule: { select: { name: true, orgId: true } } },
  });
  if (!actions.length) {
    return { summary: "No Assign Lifecycle actions remain — nothing to convert.", details };
  }
  details.actions = actions.length;

  const lookups = new Map<string, ReturnType<typeof buildStageLookup> | null>();
  const lookupFor = async (orgId: string) => {
    const cached = lookups.get(orgId);
    if (cached !== undefined) return cached;

    const board = await prisma.pipeline.findFirst({
      where: { orgId },
      orderBy: { order: "asc" },
      select: { stages: { select: { id: true, name: true } } },
    });
    if (!board) {
      lookups.set(orgId, null);
      return null;
    }
    const lifecycles = await prisma.lifecycle.findMany({
      where: { orgId },
      select: { id: true, name: true },
    });
    const built = buildStageLookup(lifecycles, board.stages);
    lookups.set(orgId, built);
    return built;
  };

  for (const action of actions) {
    const lookup = await lookupFor(action.rule.orgId);
    if (!lookup) {
      details.skippedNoBoard++;
      continue;
    }

    const stored =
      typeof action.value === "string"
        ? { lifecycleId: action.value }
        : ((action.value ?? {}) as {
            lifecycleId?: string;
            lifecycleName?: string;
            stageId?: string;
            stageName?: string;
          });

    // The mapping task may already have resolved this one; trust it, and fall back to
    // resolving from the lifecycle if it has not run.
    const hit = stored.stageId
      ? { stageId: stored.stageId, stageName: stored.stageName ?? "" }
      : resolveStage(lookup, stored.lifecycleId, stored.lifecycleName);

    if (!hit) {
      details.unresolved++;
      log(`left "${action.rule.name}" alone: its lifecycle has no column of that name`);
      continue;
    }

    details.converted++;
    if (!details.rules.includes(action.rule.name)) details.rules.push(action.rule.name);
    if (!apply) {
      log(`would convert "${action.rule.name}" to assign the ${hit.stageName} column`);
      continue;
    }

    await prisma.ruleAction.update({
      where: { id: action.id },
      data: {
        type: "ASSIGN_STAGE",
        // The lifecycle it came from is kept so the change can be traced and a rule put
        // back by hand; `readAssignStageValue` reads the stage id off either this shape or
        // a bare string.
        value: {
          stageId: hit.stageId,
          stageName: hit.stageName,
          ...(stored.lifecycleId && { lifecycleId: stored.lifecycleId }),
        } as Prisma.InputJsonValue,
      },
    });
    log(`converted "${action.rule.name}" to assign the ${hit.stageName} column`);
  }

  if (details.skippedNoBoard) {
    log(`${details.skippedNoBoard} action(s) belong to an org with no board yet`);
  }

  const verb = apply ? "Converted" : "Would convert";
  return {
    summary: `${verb} ${details.converted} of ${details.actions} action(s) to Assign Stage.`,
    details,
  };
}
