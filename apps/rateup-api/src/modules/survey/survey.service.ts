import prisma, { excludeFields } from "../../utils/prisma";
import { CreateSurveyInput, UpdateSurveyInput } from "./survey.schema";
import { getTeamIdsByUserId } from "../team/team.service";

export async function createSurvey(
  input: CreateSurveyInput,
  createdBy: string
) {
  const survey = await prisma.survey.create({
    data: { ...input, createdBy },
  });
  return survey;
}

export async function getSurveyById(id: string) {
  const survey = await prisma.survey.findUnique({
    where: {
      id,
    },
  });

  if (!survey) {
    throw new Error(`Could not find survey with id ${id}`);
  }
  return survey;
}

/**
 * Returns surveys from ALL TEAMs in which the user is a member of
 * @param userId 
 * @returns Array of surveys without questions
 */
export async function getSurveysByUserId(userId: string) {
  const teamIds = await getTeamIdsByUserId(userId);
  const surveys = await prisma.survey.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    }
  });

  const surveysWithoutQuestions = surveys.map((s) => excludeFields(s, ["questions"]))
  return surveysWithoutQuestions;
}

export async function deleteSurveyById(id: string) {
  const survey = await prisma.survey.delete({
    where: {
      id,
    },
  });
  return survey;
}

export async function updateSurveyById(id: string, input: UpdateSurveyInput) {
  const survey = await prisma.survey.update({
    where: {
      id,
    },
    data: input,
  });
  return survey;
}