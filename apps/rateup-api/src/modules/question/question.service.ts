import { randomUUID } from "crypto";
import prisma from "../../utils/prisma";
import { CreateQuestionInput, UpdateQuestionInput } from "./question.schema";

export async function createQuestion(
  surveyId: string,
  input: CreateQuestionInput
) {
  const questions = await getQuestionsBySurveyId(surveyId);
  const question = { ...input, id: randomUUID() };
  // TODO: allow to add questions in custom position.
  questions?.push(question);
  await updateQuestionsOnSurvey(surveyId, questions);

  return question;
}

export async function getQuestionById(surveyId: string, id: string) {
  const question = (await getQuestionsBySurveyId(surveyId)).find(
    (q) => q.id === id
  );
  return question;
}

export async function getQuestionsBySurveyId(surveyId: string) {
  const survey = await prisma.survey.findUnique({
    where: {
      id: surveyId,
    },
    select: {
      questions: true,
    },
  });

  if (!survey) {
    throw new Error(`Could not find survey with id ${surveyId}`);
  }

  return survey.questions as Array<Question>;
}

export async function deleteQuestionById(surveyId: string, id: string) {
  const questions = (await getQuestionsBySurveyId(surveyId)).filter(
    (question) => question.id !== id
  );
  await updateQuestionsOnSurvey(surveyId, questions);
}

export async function reorderQuestions(
  surveyId: string,
  newOrder: Array<string>
) {
  const questions = await getQuestionsBySurveyId(surveyId);
  let orderedQuestions = newOrder.map((id) =>
    questions.find((q) => q.id === id)
  ) as Array<Question>;

  await updateQuestionsOnSurvey(surveyId, orderedQuestions);
}

export async function updateQuestion(
  surveyId: string,
  questionId: string,
  input: UpdateQuestionInput
) {
  const questions = await getQuestionsBySurveyId(surveyId);
  const index = questions.findIndex((q) => q.id === questionId);
  questions[index] = { ...questions[index], ...input };

  await updateQuestionsOnSurvey(surveyId, questions);
}

/**
 * Replaces the questions field on a survey.
 *
 * @param surveyId
 * @param questions
 */
export async function updateQuestionsOnSurvey(
  surveyId: string,
  questions: Array<Question>
) {
  await prisma.survey.update({
    where: {
      id: surveyId,
    },
    data: {
      questions,
    },
  });
}
