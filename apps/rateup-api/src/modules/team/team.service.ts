import prisma from "../../utils/prisma";
import { CreateTeamInput, GetTeamsByOrgInput } from "./team.schema";

export async function createTeam(input: CreateTeamInput) {
  if (input.name.length < 2) {
    throw new Error("Invalid team name.");
  }

  try {
    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // First action: Insert name, orgId to Team table and return the ID of the newly created row
      const team = await prisma.team.create({
        data: {
          name: input.name,
          orgId: input.orgId,
        },
        select: {
          id: true, // Return the ID of the newly created row
          name: true,
        },
      });

      // Second action: Insert teamId, userId to TeamMember table
      const teamMember = await prisma.teamMember.create({
        data: {
          teamId: team.id, // Use the teamId from the first action's result
          userId: input.userId,
        },
        select: {
          id: true, // Return the ID of the newly created row
          teamId: true,
          userId: true,
        },
      });

      return { team, teamMember };
    });

    // Commit the transaction
    console.log("Transaction committed:", result);
    return result;
  } catch (error) {
    // Rollback the transaction
    console.error("Transaction rolled back:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export function getTeamsByOrgId(input: GetTeamsByOrgInput) {
  return prisma.team.findMany({
    where: {
      orgId: input.orgId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function deleteTeamById(id: string) {
  const team = await prisma.team.delete({
    where: {
      id,
    },
  });
  return team;
}
