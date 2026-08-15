import { log } from "../logger.js";
import prisma from "../../../utils/prisma.js";

/** Active members of a team, used to address campaign-completion notifications. */
export async function getUsersByTeamId(teamId: string) {
  try {
    const members = await prisma.teamMember.findMany({
      where: { teamId, user: { deletedAt: null } },
      select: { user: true },
    });
    return members.map((member) => member.user);
  } catch (error) {
    log.error({ err: error }, "Error in getUsersByTeamId:");
    throw error;
  }
}
