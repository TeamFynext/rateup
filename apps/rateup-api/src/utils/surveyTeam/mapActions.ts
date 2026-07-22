import prisma from "../prisma.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getSurveyTeamIdFromMap(surveyTeamMapId: string) {
  if (!surveyTeamMapId || !UUID_RE.test(surveyTeamMapId)) {
    return null;
  }

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
  if (!surveyTeamMapId || !UUID_RE.test(surveyTeamMapId)) {
    return null;
  }

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
