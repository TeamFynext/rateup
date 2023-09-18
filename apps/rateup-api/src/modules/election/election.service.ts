import prisma, { excludeFields } from "../../utils/prisma";

//returns all constituencies(teams) from an organization
export async function getElectionConstituencyTeamsByOrgId(orgId: string) {
  return await prisma.team.findMany({
    where: {
      orgId: orgId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

//returns all surveys by constituency(team)
export async function getSurveysByConstituency(teamId: string) {
  const surveys = await prisma.survey.findMany({
    where: {
      teamId,
    },
  });
  const surveysWithoutQuestions = surveys.map((s) =>
    excludeFields(s, ["questions", "password"])
  );
  return surveysWithoutQuestions;
}
