import prisma from "./prisma";

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
    console.log("teamMember", teamMember);
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
