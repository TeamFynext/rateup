import prisma from "../utils/prisma.js";
import type { Actor } from "./actor.js";
import { scopeWhere } from "./scope.js";

/**
 * Resource-level scope checks: a survey or pipeline is reachable when one of the teams it
 * is shared with is in the actor's scope. Org-wide actors skip the lookup.
 */
export async function surveyInScope(surveyId: string, actor: Actor): Promise<boolean> {
  if (actor.scope.all) return true;
  if (actor.scope.teamIds.length === 0) return false;
  const match = await prisma.surveyTeamMap.findFirst({
    where: { surveyId, ...scopeWhere(actor) },
    select: { id: true },
  });
  return match !== null;
}

export async function pipelineInScope(pipelineId: string, actor: Actor): Promise<boolean> {
  if (actor.scope.all) return true;
  if (actor.scope.teamIds.length === 0) return false;
  const match = await prisma.pipelineTeam.findFirst({
    where: { pipelineId, ...scopeWhere(actor) },
    select: { pipelineId: true },
  });
  return match !== null;
}
