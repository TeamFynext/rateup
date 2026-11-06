import prisma from "../utils/prisma.js";
import type { Actor } from "./actor.js";
import { ForbiddenError } from "./errors.js";

/**
 * A Prisma `where` fragment restricting rows to the actor's teams. A row with no team is
 * org-wide and passes; callers spread the result into their own `where`.
 */
export function scopeWhere<F extends string = "teamId">(
  actor: Actor,
  field: F = "teamId" as F,
): Partial<Record<F, { in: string[] }>> {
  if (actor.scope.all) return {};
  return { [field]: { in: [...actor.scope.teamIds] } } as Partial<Record<F, { in: string[] }>>;
}

/**
 * Whether a team id is inside the actor's scope. Pure: it does not know which org a team
 * belongs to, so for an org-wide actor every id passes. For an id taken from a request use
 * `teamInScope`, which also proves the team is the actor's org's.
 */
export function inScope(actor: Actor, teamId: string | null | undefined): boolean {
  if (actor.scope.all) return true;
  if (teamId == null) return true;
  return actor.scope.teamIds.includes(teamId);
}

export function assertInScope(actor: Actor, teamId: string | null | undefined): void {
  if (!inScope(actor, teamId)) {
    throw new ForbiddenError("This team is outside your access.", { reason: "scope" });
  }
}

export function assertAllInScope(actor: Actor, teamIds: readonly string[]): void {
  for (const teamId of teamIds) assertInScope(actor, teamId);
}

/**
 * `inScope` for a team id the client named: the team must exist and belong to the actor's
 * org before the team-scope test runs. Without the org check an org-wide actor (OWNER,
 * ADMIN) passes for any org's team id.
 */
export async function teamInScope(actor: Actor, teamId: string): Promise<boolean> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { orgId: true } });
  if (!team || team.orgId !== actor.orgId) return false;
  return inScope(actor, teamId);
}
