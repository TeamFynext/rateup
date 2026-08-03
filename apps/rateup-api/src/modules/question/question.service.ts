import { MultipartFile } from "@fastify/multipart";
import { parseCsvObjects } from "hucre/csv";
import { readXlsxObjects, type CellValue } from "hucre";
import { randomUUID } from "node:crypto";
import prisma from "../../utils/prisma.js";
import { updateSurveyVariables } from "../survey/survey.service.js";
import { createSurveyDefaultVariableForQuestion } from "../survey/survey.utils.js";
import { CreateQuestionInput, UpdateQuestionInput } from "./question.schema.js";
import { emailPattern, getQuestionsArrUpdatedGRTypeQuestion } from "./question.utils.js";

export async function createQuestion(surveyId: string, input: CreateQuestionInput) {
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
  const newQuestion = { ...rest, id: randomUUID() } as unknown as Question;

  // 4. Insert new question at position
  questions.splice(position, 0, newQuestion);
  await updateQuestionsOnSurvey(surveyId, questions);

  await createSurveyDefaultVariableForQuestion(surveyId, newQuestion, position);
  return newQuestion;
}

export async function getQuestionById(surveyId: string, id: string) {
  const question = (await getQuestionsBySurveyId(surveyId)).find((q) => q.id === id);
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
  const updatedQuestions = await getQuestionsArrUpdatedGRTypeQuestion(questions, surveyId);
  await updateQuestionsOnSurvey(surveyId, updatedQuestions);
  await updateSurveyVariables(surveyId, updatedQuestions);
  const flow = await prisma.waFlow.findFirst({
    where: {
      surveyId: surveyId,
    },
  });
  function removeObjectsByQuestionId(
    data: PrismaJson.PWaFlowLogicJumps,
    questionIdToRemove: string,
  ) {
    // Iterate through each key in the object
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        // Filter out the objects where the questionId matches the one to remove
        data[key] = data[key].filter(
          (item) =>
            !item.conditions.some((condition) => condition.questionId === questionIdToRemove),
        );
      }
    }
    return data;
  }
  if (flow?.dbFlowId) {
    await prisma.waFlow.update({
      where: {
        dbFlowId: flow.dbFlowId,
      },
      data: {
        logicJumps: removeObjectsByQuestionId(flow.logicJumps, id),
      },
    });
  }
}

export async function reorderQuestions(surveyId: string, newOrder: Array<string>) {
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
    (item) => item["reviewPageOptions"] !== null && item["reviewPageOptions"] !== undefined,
  );

  if (hasGoogleReview) {
    //Turn off kiosk
    await prisma.survey.update({
      where: { id: surveyId },
      data: { kioskMode: false },
    });
  }

  const updatedQuestions = await getQuestionsArrUpdatedGRTypeQuestion(questions, surveyId);
  await updateQuestionsOnSurvey(surveyId, updatedQuestions);
}

/**
 * Replaces the questions field on a survey.
 *
 * @param surveyId
 * @param questions
 */
export async function updateQuestionsOnSurvey(surveyId: string, questions: Array<Question>) {
  let surveyQns = await prisma.survey.update({
    where: {
      id: surveyId,
    },
    data: {
      questions,
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
export async function updateLogicJump(screenId: string, surveyId: string) {
  const flow = await prisma.waFlow.findFirst({
    where: {
      surveyId: surveyId,
    },
  });
  if (!flow) {
    throw new Error(`Flow not found for surveyId: ${surveyId}`);
  }
  let data = flow.logicJumps;
  delete data[screenId];
  await prisma.waFlow.update({
    where: {
      dbFlowId: flow.dbFlowId,
    },
    data: {
      logicJumps: data,
    },
  });
}
export async function getAllowedEmailsFromFile(fileBody: MultipartFile) {
  const { mimetype } = fileBody;
  const csvType = ["text/csv", "application/vnd.ms-excel"];
  const buffer = await fileBody.toBuffer();
  const allowedEmails: string[] = [];

  const processEmail = (row: Record<string, unknown>) => {
    if (!emailPattern.test(String(row?.email ?? ""))) {
      throw new Error("Invalid Email");
    }
    allowedEmails.push(String(row.email));
  };

  if (csvType.includes(mimetype)) {
    const { data } = parseCsvObjects(buffer.toString("utf-8"), {
      header: true,
      skipEmptyRows: true,
      transformHeader: (header) => header?.trim()?.toLowerCase(),
    });
    data.forEach(processEmail);
  } else {
    const { data } = await readXlsxObjects(buffer, {
      transformHeader: (header) => header?.toString()?.trim()?.toLowerCase(),
      // An empty cell yields undefined here, as it always has.
      transformValue: (value) => value?.toString()?.trim() as CellValue,
    });
    data.forEach(processEmail);
  }

  if (allowedEmails.length === 0) {
    throw new Error("No email IDs found");
  }
  return allowedEmails;
}
