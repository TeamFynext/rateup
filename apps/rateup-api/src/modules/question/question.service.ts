import { randomUUID } from "crypto";
import prisma from "../../utils/prisma";
import { CreateQuestionInput, UpdateQuestionInput } from "./question.schema";
import { updateSurveyVariables } from "../survey/survey.service";
import { createSurveyDefaultVariableForQuestion } from "../survey/survey.utils";

export async function createQuestion(
  surveyId: string,
  input: CreateQuestionInput,
) {
  // 1. Get existing questions
  const questions = await getQuestionsBySurveyId(surveyId);

  // 2. Determine position of new question
  let { position, ...rest } = input;
  if (!position) {
    position = questions.length;
  }
  if (position > questions.length || position < 0) {
    throw new Error(
      `'position'(order) must be between 0 and the number of questions(${questions.length})`,
    );
  }

  // Ensure title is defined and not an empty object
  if (!rest.title || Object.keys(rest.title).length === 0) {
    throw new Error(`'title' property is required for a question`);
  }

  // rest.title is to be a non-empty object
  const newQuestion = { ...rest, id: randomUUID() } as Question;

  // 4. Insert new question at position
  questions.splice(position, 0, newQuestion);
  await updateQuestionsOnSurvey(surveyId, questions);

  await createSurveyDefaultVariableForQuestion(surveyId, newQuestion, position);
  return newQuestion;
}

export async function getQuestionById(surveyId: string, id: string) {
  const question = (await getQuestionsBySurveyId(surveyId)).find(
    (q) => q.id === id,
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

  return survey.questions as unknown as Array<Question>;
}

export async function deleteQuestionById(surveyId: string, id: string) {
  const questions = (await getQuestionsBySurveyId(surveyId)).filter(
    (question) => question.id !== id,
  );
  await updateQuestionsOnSurvey(surveyId, questions);
  await updateSurveyVariables(surveyId, questions);
}

export async function reorderQuestions(
  surveyId: string,
  newOrder: Array<string>,
) {
  const questions = await getQuestionsBySurveyId(surveyId);
  let orderedQuestions = newOrder.map((id) =>
    questions.find((q) => q.id === id),
  ) as Array<Question>;

  await updateQuestionsOnSurvey(surveyId, orderedQuestions);
  await updateSurveyVariables(surveyId, orderedQuestions);
}

export async function updateQuestion(
  surveyId: string,
  questionId: string,
  input: UpdateQuestionInput,
) {
  const questions = await getQuestionsBySurveyId(surveyId);
  const index = questions.findIndex((q) => q.id === questionId);
  // questions[index] = { ...questions[index], ...input };
  questions[index] = { ...questions[index], ...input } as Question;

  let hasGoogleReview = questions?.some(
    (item) => item.googleReview !== null && item.googleReview !== undefined,
  );
  if (hasGoogleReview) {
    //Turn off kiosk
    const surveyUpdate = await prisma.survey.update({
      where: { id: surveyId },
      data: { kioskMode: false },
    });
  }

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
  questions: Array<Question>,
) {
  let surveyQns = await prisma.survey.update({
    where: {
      id: surveyId,
    },
    data: {
      questions: questions as any,
    },
  });

  if (surveyQns) {
    for (const question of questions) {
      if (question.ticketIssue !== undefined) {
        await prisma.survey.update({
          where: {
            id: surveyId,
          },
          data: {
            enableTickets: true,
          },
        });
        break;
      }
    }
  }
}
