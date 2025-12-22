import prisma from "../prisma.js";

export async function getSurveyTeamIdFromMap(surveyTeamMapId: string) {
  const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
    where: {
      id: surveyTeamMapId,
    },
  });

  if (!surveyTeamMap) {
    return null;
  }

  return surveyTeamMap?.teamId;
}

export async function getSurveyIdfromMap(surveyTeamMapId: string) {
  const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
    where: {
      id: surveyTeamMapId,
    },
  });

  if (!surveyTeamMap) {
    return null;
  }

  return surveyTeamMap?.surveyId;
}
