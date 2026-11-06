import { assertPlanLimit } from "../subscription/planLimits.js";

/**
 * Throws when the org has no seat left for another invitation.
 *
 * The route gate is what gives the dashboard its 403; this is the backstop for every
 * other way an invite is created — the Zapier integration calls `inviteTeamMember`
 * directly, with no preHandler in front of it, so a limit that lived only on the route
 * would be one integration away from not existing.
 *
 * A thin wrapper on purpose: the counting, the ceiling and the wording all come from the
 * `users` row in PLAN_LIMITS, so the two paths cannot refuse on different numbers.
 */
export async function assertSeatAvailable(orgId: string) {
  await assertPlanLimit(orgId, "users");
}
