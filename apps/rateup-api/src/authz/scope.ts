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
