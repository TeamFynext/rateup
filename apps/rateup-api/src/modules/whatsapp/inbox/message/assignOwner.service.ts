import type { Actor } from "../../../../authz/actor.js";
import { assertInScope, inScope } from "../../../../authz/scope.js";
import { HttpError } from "../../../../utils/http.js";
import prisma from "../../../../utils/prisma.js";
import { UserAvailabilityStatus } from "../../../user/user.schema.js";
import { assignChat } from "../../whatsappSurvey/wasurvey.utils.js";
import type { AssignOwnerBody } from "./wamessage.schema.js";
import { assignWaMessageToUser } from "./wamessage.service.js";

/** Keys the manual round-robin pointer apart from each automation's own. */
const MANUAL_ROUND_ROBIN = "manual-assign";

async function teamIdsOfMember(userId: string, orgId: string) {
  const rows = await prisma.teamMember.findMany({
    where: { userId, team: { orgId } },
    select: { teamId: true },
  });
  return rows.map((r) => r.teamId);
}

/** The team the ticket is currently worked under, if anyone is on it. */
async function currentTeamOfTicket(contactId: string, conversationId?: string | null) {
  if (conversationId) {
    const row = await prisma.conversationAssignedUserTeamMap.findFirst({
      where: { conversationId, lastRemovedAt: null },
      orderBy: { lastAssignedAt: "desc" },
      select: { teamId: true },
    });
    if (row) return row.teamId;
  }
  const legacy = await prisma.waInboxAssign.findFirst({
    where: { contactId },
    select: { teamId: true },
  });
  return legacy?.teamId ?? null;
}

/**
 * Picks the team an owner is recorded under. The team decides who can see the
 * ticket, so a person keeps the ticket's current team when they are in it rather
 * than dragging it into whichever of their teams happens to be first.
 */
async function resolveOwnerTeam(
  userId: string,
  actor: Actor,
  requested: string | null | undefined,
  contactId: string,
  conversationId?: string | null,
) {
  const memberOf = await teamIdsOfMember(userId, actor.orgId);
  if (memberOf.length === 0) throw new HttpError("This person is not in any team", 400);
  if (requested && memberOf.includes(requested)) return requested;
  const current = await currentTeamOfTicket(contactId, conversationId);
  if (current && memberOf.includes(current)) return current;
  // Otherwise one of their teams the actor may assign into, so a scoped manager
  // sharing any team with the person is not refused over the other's order.
  return memberOf.find((teamId) => inScope(actor, teamId)) ?? memberOf[0];
}

/** One member of the team, turn by turn, preferring people who are available. */
async function pickFromTeam(teamId: string, orgId: string) {
  const members = await prisma.orgMember.findMany({
    where: { orgId, user: { teamMember: { some: { teamId } } } },
    select: { userId: true, status: true },
    orderBy: { userId: "asc" },
  });
  if (members.length === 0) throw new HttpError("This team has no members", 409);
  const available = members.filter((m) =>
    [UserAvailabilityStatus.online, UserAvailabilityStatus.busy].includes(
      m.status as UserAvailabilityStatus,
    ),
  );
  const pool = (available.length ? available : members).map((m) => m.userId);
  return await assignChat(teamId, pool, MANUAL_ROUND_ROBIN);
}

/**
 * Sets a ticket's single owner. `userId` names the person; `teamId` alone hands the
 * ticket to one member of that team; neither unassigns it. Everything downstream
 * (events, notifications, reopening a closed ticket) is `assignWaMessageToUser`.
 */
export async function assignConversationOwner(body: AssignOwnerBody, actor: Actor) {
  const { contactId, conversationId, messageId } = body;
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, orgId: actor.orgId },
    select: { id: true },
  });
  if (!contact) throw new HttpError("Contact not found", 404);

  let assignees: { userId: string; teamId: string }[] = [];
  if (body.userId) {
    const teamId = await resolveOwnerTeam(
      body.userId,
      actor,
      body.teamId,
      contactId,
      conversationId,
    );
    assignees = [{ userId: body.userId, teamId }];
  } else if (body.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: body.teamId, orgId: actor.orgId },
      select: { id: true },
    });
    if (!team) throw new HttpError("Team not found", 404);
    assignees = [{ userId: await pickFromTeam(team.id, actor.orgId), teamId: team.id }];
  }
  for (const a of assignees) assertInScope(actor, a.teamId);

  return await assignWaMessageToUser(
    { contactId, conversationId, messageId, assignees },
    actor.orgId,
    actor.userId,
  );
}
