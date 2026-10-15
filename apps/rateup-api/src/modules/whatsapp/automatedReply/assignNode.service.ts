import { log } from "../../../utils/logger.js";
import { getTeamIdsByUserId } from "../../team/team.service.js";
import { getUserIdsByTeamId } from "../../user/user.service.js";
import {
  assignWaMessageToUser,
  getAssignedUsersCountForContactByTeam,
} from "../inbox/message/wamessage.service.js";
import type { AssignNodeData } from "../whatsappSurvey/node-types.js";
import { assignChat } from "../whatsappSurvey/wasurvey.utils.js";

/**
 * Runs a flow's assignNode against a contact that is already resolved, so every channel
 * can share it: WhatsApp finds the contact by phone, Instagram by igsId, Messenger by psid.
 *
 * `alreadyAssigned` means a round-robin assignment was skipped because someone on the team
 * already has the contact. The WhatsApp engine stops the flow on it.
 */
export async function runAssignNode(
  assignData: AssignNodeData | undefined,
  contactId: string,
  orgId: string,
  automationId: string,
): Promise<"assigned" | "alreadyAssigned" | "skipped"> {
  let assignedUserIds = assignData?.assign?.assignedUserIds || [];
  let teamId = assignData?.assign?.teamId || null;
  if (assignData?.assign?.assignType === "me") {
    const teams = await getTeamIdsByUserId(assignedUserIds?.[0]);
    teamId = teams?.[0] || null;
  } else if (
    teamId &&
    assignData?.assign?.choice === "all" &&
    (assignData?.assign?.roundRobin || false)
  ) {
    const assignedCount = await getAssignedUsersCountForContactByTeam(contactId, teamId);
    if (assignedCount > 0) {
      log.warn(
        `Skipping assignment: Contact ${contactId} already has assigned users in team ${teamId}`,
      );
      return "alreadyAssigned";
    }
    const users = await getUserIdsByTeamId(teamId);
    const assigned = await assignChat(teamId, users, automationId);
    assignedUserIds = [assigned];
  } else if (
    teamId &&
    assignData?.assign?.choice === "manual" &&
    (assignData?.assign?.roundRobin || false)
  ) {
    const assignedCount = await getAssignedUsersCountForContactByTeam(contactId, teamId);
    if (assignedCount > 0) {
      log.warn(
        `Skipping assignment: Contact ${contactId} already has assigned users in team ${teamId}`,
      );
      return "alreadyAssigned";
    }
    const assigned = await assignChat(teamId, assignedUserIds, automationId);
    assignedUserIds = [assigned];
  } else if (teamId && assignData?.assign?.choice === "all") {
    const users = await getUserIdsByTeamId(teamId);
    assignedUserIds = users;
  }
  // Only assign if we have user IDs and a team
  if (assignedUserIds.length > 0 && teamId && contactId) {
    await assignWaMessageToUser(
      {
        assignees: assignedUserIds.map((userId) => ({ userId, teamId })),
        contactId,
        assignIfOnline: assignData?.assign?.assignIfOnline ?? true,
      },
      orgId,
    );
    return "assigned";
  }
  log.warn(
    `Assignment skipped: assignedUserIds=${JSON.stringify(
      assignedUserIds,
    )}, teamId=${teamId}, contactId=${contactId}`,
  );
  return "skipped";
}
