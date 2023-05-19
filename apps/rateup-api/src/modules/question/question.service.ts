import prisma from "../../utils/prisma";
import { CreateQuestionInput, UpdateQuestionInput } from "./question.schema";
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

export async function reorderQuestions(surveyId: string, newOrder: Array<string>) {
  const questions = await getQuestionsBySurveyId(surveyId);
  if (questions.length !== newOrder.length) {
    throw new Error("Invalid new order");
  }

  const transactions = newOrder.map((questionId, index) => {
    return prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        order: index + 1,
      },
    });
  })

  await prisma.$transaction(transactions);
}

export async function updateQuestion(id: string, input: UpdateQuestionInput) {
  const question = await prisma.question.update({
    where: {
      id,
    },
    data: input,
  });
  return question;
}