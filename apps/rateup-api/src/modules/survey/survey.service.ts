import prisma from "../../utils/prisma";
import { CreateSurveyInput } from "./survey.schema";

export async function createSurvey(input: CreateSurveyInput) {
  const survey = await prisma.survey.create({
    data: input,
  });
  return survey;
}

export async function getSurveyById(id: string) {
  const survey = await prisma.survey.findUnique({
    where: {
      id,
    },
  });
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
