import prisma from "../../utils/prisma";

export function isShortId(id: string) {
  return id.length === 8;
}

export async function getSurveysOrgId(surveyId: string) {
  const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
    where: {
      surveyId: surveyId,
    },
    include: {
      team: true,
    },
  });
  return surveyTeamMap.team.orgId;
}

export async function getSurveyTeamMapIdFromShortId(shortId: string) {
  const res = await prisma.surveyTeamMap.findFirst({
    where: {
      shortUrlId: shortId,
    },
    select: {
      id: true,
    },
  });

  return res?.id;
}
