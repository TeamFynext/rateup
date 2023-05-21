import prisma from "../../utils/prisma";
import { CreateSurveyInput } from "./survey.schema";

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

// TODO: only return surveys belonging to the user
export async function getSurveys() {
  const survey = await prisma.survey.findMany();
  return survey;
}

export async function deleteSurveyById(id: string) {
  const survey = await prisma.survey.delete({
    where: {
      id,
    },
  });
  return survey;
}
