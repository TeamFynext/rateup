import prisma from "./prisma";
import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";

export async function getUserIdFromRequest(request: FastifyRequest, reply: FastifyReply) {
  let session = await Session.getSession(request, reply);
  return session.getUserId();
}

export async function hasAccessToSurvey(surveyId: string, userId: string) {
  try {
    const survey = await prisma.survey.findUnique({
      where: {
        id: surveyId,
      },
    });
    const teamId = survey!.teamId;
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId,
      },
    });
    return teamMember !== null;
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