import prisma from "./prisma";
import { FastifyReply, FastifyRequest } from "fastify";
import { Role } from "@prisma/client";
import { log } from "./logger";

export async function hasAccessToSurvey(surveyId: string, userId: string) {
  try {
    if (!surveyId || !userId) {
      throw new Error('surveyId and userId must not be empty strings');
    }
    
    const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
      where: {
        surveyId: surveyId,
      },
      include: {
        team: true,
      },
    });

    // Check if the user is part of any of the teams associated with the survey
    for (let surveyTeamMap of surveyTeamMaps) {
      const teamId = surveyTeamMap.team.id;
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          userId,
          teamId,
        },
      });
      if (teamMember) {
        return true;
      }
    }

  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function hasAccessToTeam(teamId: string, userId: string) {
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
    },
  });
  return teamMember !== null;
}

export async function hasAccessOfTeamAdmin(teamId: string, userId: string) {
  const teamMember = await hasAccessToTeam(teamId, userId)

  if (teamMember) {
    const superAdmin = await prisma.orgMember.findFirst({
      where: {
        userId: userId,
        org: {
          teams: {
            some: {
              id: teamId,
            },
          },
        },
        role: 'SUPER_ADMIN',
      },
    });

    if (!superAdmin) {
      return false;
    } else {
      return true
    }
  }

  return false;
}

export async function verifyRole(
  request: FastifyRequest,
  reply: FastifyReply,
  role: Role
) {
  try {
    if (request.user.role !== role) {
      reply.code(403).send({ message: 'Not authorized' })
    } else {
      return true
    }
  } catch (err) {
    log.fatal('Error verifying role\n%o\nrequest.user => %o', err, request.user)
    reply.code(403).send({ message: 'Not authorized' })
  }
}