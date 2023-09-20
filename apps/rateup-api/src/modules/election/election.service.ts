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
      tags: true,
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

//return all the media from the database
export async function getAllMedia() {
  return await prisma.media.findMany();
}

//get all surveys which has tags matching with the constituency(team) tags

export async function getAllSurveysUnderOrganization(teamIds: Array<string>) {
  const surveys = await prisma.survey.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
  });
  const surveysWithoutQuestions = surveys.map((s) =>
    excludeFields(s, ["questions", "password"])
  );
  return surveysWithoutQuestions;
}
//returns all survey responses by survey ids

export async function getAllSurveyResponsesBySurveyIds(
  surveyIds: Array<string>
) {
  return await prisma.surveyResponse.findMany({
    where: {
      surveyId: {
        in: surveyIds,
      },
    },
  });
}
