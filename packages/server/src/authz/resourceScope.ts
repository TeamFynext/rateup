import prisma from "../utils/prisma.js";
import type { Actor } from "./actor.js";
import { scopeWhere } from "./scope.js";

/**
 * Resource-level scope checks: a survey or pipeline is reachable when one of the teams it
 * is shared with is in the actor's scope. Org-wide actors skip the team lookup but not the
 * org check: the id comes from the request, so it can name another org's row.
 */
export async function surveyInScope(surveyId: string, actor: Actor): Promise<boolean> {
  if (actor.scope.all) {
    // Org-wide means the actor's own org, not every org. A survey whose `orgId` was never
    // set (rows from before the column existed) belongs to the org of the teams it is
    // shared with, never to whoever asks.
    const owned = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        OR: [
          { orgId: actor.orgId },
          { orgId: null, teams: { some: { team: { orgId: actor.orgId } } } },
        ],
      },
      select: { id: true },
    });
    return owned !== null;
  }
  if (actor.scope.teamIds.length === 0) return false;
  const match = await prisma.surveyTeamMap.findFirst({
    where: { surveyId, team: { orgId: actor.orgId }, ...scopeWhere(actor) },
    select: { id: true },
  });
  return match !== null;
}

export async function pipelineInScope(pipelineId: string, actor: Actor): Promise<boolean> {
  if (actor.scope.all) {
    const owned = await prisma.pipeline.findFirst({
      where: { id: pipelineId, orgId: actor.orgId },
      select: { id: true },
    });
    return owned !== null;
  }
  if (actor.scope.teamIds.length === 0) return false;
  const match = await prisma.pipelineTeam.findFirst({
    where: { pipelineId, pipeline: { orgId: actor.orgId }, ...scopeWhere(actor) },
    select: { pipelineId: true },
  });
  return match !== null;
}
