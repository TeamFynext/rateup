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
  // `!position` treated an explicit 0 — the front of the survey, the question
  // respondents see first — as "not given", so the question was appended instead,
  // with a 201 and no indication the position was ignored. The bounds check two
  // lines below explicitly allows 0. See issues.txt 39.5.
  if (position === undefined) {
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
    // Iterate through each key in the object.
    // Both guards below were absent: `data[key]` was assumed to be an array and
    // `item.conditions` to exist, so a single malformed logic-jump entry threw a
    // TypeError — by which point the questions had already been rewritten and the
    // survey variables updated, leaving the survey half-migrated with the flow
    // untouched. See issues.txt 39.7.
    if (!data || typeof data !== "object") return data;
    for (const key in data) {
      if (Object.hasOwn(data, key) && Array.isArray(data[key])) {
        // Filter out the objects where the questionId matches the one to remove
        data[key] = data[key].filter(
          (item) =>
            !item?.conditions?.some?.((condition) => condition.questionId === questionIdToRemove),
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

/** Raised when a reorder is not a permutation of the survey's questions. */
export class QuestionOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionOrderError";
  }
}

/**
 * Reorders a survey's questions.
 *
 * The new array used to be MAPPED from the request rather than merged with the
 * existing one, and the result was written over the questions column — so a short
 * list deleted every question it omitted and `[]` emptied the survey outright,
 * with no confirmation step and no soft delete. That was reachable by ordinary
 * use: a client computing the order from a stale view of the questions sends a
 * short array.
 *
 * An id matching nothing was worse still — it became `undefined` in the array,
 * and updateQuestionsOnSurvey wrote the array FIRST and only then dereferenced
 * it, so the corrupt array was already persisted when the request failed.
 * Nothing is written unless the order is a permutation of the current ids.
 * See issues.txt 39.1.
 */
export async function reorderQuestions(surveyId: string, newOrder: Array<string>) {
  const questions = await getQuestionsBySurveyId(surveyId);
  const byId = new Map(questions.map((q) => [q.id, q]));

  if (new Set(newOrder).size !== newOrder.length) {
    throw new QuestionOrderError("The new order repeats a question id");
  }
  if (newOrder.length !== questions.length) {
    throw new QuestionOrderError(
      `The new order must name all ${questions.length} questions; it named ${newOrder.length}`,
    );
  }

  const orderedQuestions: Array<Question> = [];
  for (const id of newOrder) {
    const question = byId.get(id);
    if (!question) {
      throw new QuestionOrderError(
        `The new order names a question this survey does not have: ${id}`,
      );
    }
    orderedQuestions.push(question);
  }

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
  // The flag used to be written by a SECOND prisma.survey.update issued after the
  // first, so a failure between them left the questions written and the flag not.
  // It rides along with the questions now.
  //
  // The condition was `!== undefined`, so a question carrying `ticketIssue: null`
  // or `""` switched ticket creation on. See issues.txt 39.4.
  //
  // STILL ONE-WAY: `enableTickets` is only ever set true here, never false, so
  // removing the last question with a ticket issue leaves the survey raising
  // tickets for responses that no longer have a rule behind them. Setting it
  // BOTH ways — what 39.4's Fix line asks for — would silently override the
  // operator's own toggle, because enableTickets is also a field of the survey
  // update endpoint (survey.schema.ts:130). Which writer wins is a decision
  // recorded in issues.txt 39.4 rather than made here.
  const enablesTickets = questions.some(
    (question) => question.ticketIssue !== undefined && question.ticketIssue !== null,
  );

  await prisma.survey.update({
    where: {
      id: surveyId,
    },
    data: {
      questions,
      ...(enablesTickets ? { enableTickets: true } : {}),
    },
  });
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
  // flow.logicJumps is a Json column, so it may be null — `delete data[screenId]`
  // threw for that. See issues.txt 39.7.
  let data = flow.logicJumps && typeof flow.logicJumps === "object" ? flow.logicJumps : {};
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

  // Threw on the FIRST bad row, abandoning the whole file — an operator
  // uploading a few thousand addresses got a single "Invalid Email" with no row
  // number, no count and no partial result, and bisecting the spreadsheet by hand
  // was the only way to find it. A file with no `email` column failed the same
  // way on its first row rather than saying the column was missing.
  // See issues.txt 39.6.
  const rejected: Array<{ row: number; value: string }> = [];
  let rowsSeen = 0;
  let sawEmailColumn = false;

  const processEmail = (row: Record<string, unknown>, index: number) => {
    rowsSeen++;
    if (row && Object.hasOwn(row, "email")) sawEmailColumn = true;
    const value = String(row?.email ?? "");
    if (!emailPattern.test(value)) {
      // +2: one for the header line, one because a spreadsheet's first data row
      // is row 2 to the person looking at it.
      if (rejected.length < 20) rejected.push({ row: index + 2, value });
      return;
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

  // Only meaningful once there is a row to look at: a header-only file has no
  // rows at all and is "no email IDs found", not "no email column".
  if (rowsSeen > 0 && !sawEmailColumn) {
    throw new Error("The file has no 'email' column");
  }
  if (rejected.length) {
    const detail = rejected.map((r) => `row ${r.row} (${r.value || "empty"})`).join(", ");
    const more = rejected.length === 20 ? ", and more" : "";
    throw new Error(`Invalid email addresses: ${detail}${more}`);
  }
  if (allowedEmails.length === 0) {
    throw new Error("No email IDs found");
  }
  return allowedEmails;
}
