import prisma from "../../utils/prisma";
import { CreateTeamInput, GetTeamMembersInput, GetTeamsByOrgInput, InviteMemberInput } from "./team.schema";

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

export async function inviteTeamMember(input : InviteMemberInput){
  if (input.name.length < 2) {
    throw new Error("Invalid name.");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (input.email.length < 6 || !emailRegex.test(input.email)) {
    throw new Error("Invalid email. Please enter a valid email address.");
  }
try {
    const { email, name, orgId, teamId, invitedBy, type } = input;

     // Check if team member with the input email already exists
    const existingTeamMember = await prisma.teamMember.findFirst({
      where: {
        user: {
          email,
        },
        team: {
          id: teamId,
        },
      },
    });

    if (existingTeamMember) {
      throw new Error('Team member with the provided email already exists in the team.');
    }


    // Check if the user with the input email is already a member in any organization with role SUPER_ADMIN
    const existingOrgMember = await prisma.orgMember.findFirst({
      where: {
        user: {
          email,
        },
        role: 'SUPER_ADMIN',
      },
    });

    if (existingOrgMember) {
      throw new Error('User with the provided email is already a SUPER_ADMIN member in an organization.');
    }

        // Check if the email already exists in the invitation table
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
      },
    });

    if (existingInvitation) {
      if (existingInvitation.status === 'PENDING') {
       
        // Call Resend email function here
       //TODO
        
        throw new Error('Invitation with the provided email is already pending.');
      }
       else if (existingInvitation.status === 'ACCEPTED' && existingInvitation.teamId === teamId) {
        throw new Error('Team member with the provided email already exists.');
      }
    }

    
    const newInvite = await prisma.invitation.create({
      data: {
        email,
        name,
        orgId,
        teamId,
        type,
        invitedBy
      }
    });
    
    console.log("Invite created successfully");
    return newInvite
    
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export function getTeamMembers(input: GetTeamMembersInput) {
  return prisma.teamMember.findMany({
    where: {
      teamId: input.teamId,
    },
    select: {
      id: true, // or any other fields you want from teamMember
      user: {
        select: {
          id: true,
          email:true,
          name: true,
        },
      },
    },
  });
}
export async function getTeamIdsByUserId(userId: string) {
  const teams = await prisma.teamMember.findMany({
    where: {
      userId,
    },
    select: {
      teamId: true,
    }
  });

  const teamIds = teams.map(team => team.teamId);
  return teamIds;
}