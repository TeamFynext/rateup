import prisma from "../../utils/prisma";
import { getSurveyById } from "../survey/survey.service";
import { CreateQuestionInput } from "./question.schema";
export async function createQuestion(input: CreateQuestionInput) {
  const question = await prisma.question.create({
    data: input,
  });
  return question;
}

export async function getQuestionById(id: string) {
  const question = await prisma.question.findUnique({
    where: {
      id,
    },
  });
  return question;
}

export async function getQuestionsBySurveyId(surveyId: string) {
  const questions = await prisma.question.findMany({
    where: {
      surveyId,
    },
  });
  return questions;
}

export async function deleteQuestionById(id: string) {
  const question = await prisma.question.delete({
    where: {
      id,
    },
  });
  return question;
}
