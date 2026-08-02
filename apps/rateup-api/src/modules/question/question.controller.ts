import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateQuestionInput,
  QuestionRouteParams,
  QuestionsRouteParams,
  ReplaceQuestionsInput,
  UpdateQuestionInput,
  UpdateQuestionsOrderInput,
} from "./question.schema.js";
import {
  createQuestion,
  deleteQuestionById,
  getAllowedEmailsFromFile,
  getQuestionById,
  getQuestionsBySurveyId,
  QuestionOrderError,
  reorderQuestions,
  updateLogicJump,
  updateQuestion,
  updateQuestionsOnSurvey,
} from "./question.service.js";
import { getSurveyById } from "../survey/survey.service.js";
import { log } from "../../utils/logger.js";

/**
 * Every catch in this file used to be a bare `reply.code(500)` and every
 * not-found branch a bare `reply.code(404)`.
 *
 * reply.code sets the status and returns the reply for chaining — it does not
 * send — and Fastify treats an async handler that resolves undefined without a
 * sent reply as a promise to answer later. So none of those paths answered: they
 * held the connection until something timed it out, which for a client that
 * retries on timeout means deleting the next thing it names.
 * See issues.txt 39.3.
 */
function fail(reply: FastifyReply, error: unknown, context: string) {
  log.error({ err: error }, context);
  if (error instanceof QuestionOrderError) {
    return reply.code(400).send({ message: error.message });
  }
  return reply.code(500).send({ message: "Something went wrong" });
}

const notFound = (reply: FastifyReply) => reply.code(404).send({ message: "Question not found" });

export async function createQuestionHandler(
  request: FastifyRequest<{
    Body: CreateQuestionInput;
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  try {
    const surveyId = request.params.surveyId;
    const question = await createQuestion(surveyId, body);
    reply.code(201).send(question);
  } catch (e) {
    return fail(reply, e, "Error creating question");
  }
}

export async function getQuestionByIdHandler(
  request: FastifyRequest<{
    Params: QuestionRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const question = await getQuestionById(surveyId, request.params.id);

    if (!question) {
      return notFound(reply);
    }
    reply.send(question);
  } catch (e) {
    return fail(reply, e, "Error reading question");
  }
}

export async function getQuestionsBySurveyIdHandler(
  request: FastifyRequest<{
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const questions = await getQuestionsBySurveyId(request.params.surveyId);
    reply.send(questions);
  } catch (e) {
    return fail(reply, e, "Error listing questions");
  }
}

export async function deleteQuestionByIdHandler(
  request: FastifyRequest<{
    Params: QuestionRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const question = await getQuestionById(surveyId, request.params.id);

    if (!question) {
      return notFound(reply);
    }
    await deleteQuestionById(surveyId, request.params.id);
    // NEITHER branch used to send. The success path awaited the delete and
    // returned, so DELETE /api/question/:surveyId/:id never answered at all —
    // even when it succeeded. See issues.txt 39.3.
    reply.code(200).send({ success: true });
  } catch (e) {
    return fail(reply, e, "Error deleting question");
  }
}

export async function reorderQuestionsHandler(
  request: FastifyRequest<{
    Body: UpdateQuestionsOrderInput;
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    await reorderQuestions(surveyId, request.body);
    reply.code(200).send();
  } catch (e) {
    return fail(reply, e, "Error reordering questions");
  }
}

export async function updateQuestionHandler(
  request: FastifyRequest<{
    Body: UpdateQuestionInput;
    Params: QuestionRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const id = request.params.id;
    // check if question exists
    const question = await getQuestionById(surveyId, id);
    if (!question) {
      return notFound(reply);
    }
    // update question
    await updateQuestion(surveyId, id, request.body);
    reply.code(200).send();
  } catch (e) {
    return fail(reply, e, "Error updating question");
  }
}

export async function replaceQuestionsHandler(
  request: FastifyRequest<{
    Body: ReplaceQuestionsInput;
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const { questions, screenId } = request.body;
    await updateQuestionsOnSurvey(surveyId, questions as unknown as Array<Question>);
    if (screenId) {
      await updateLogicJump(screenId, surveyId);
    }
    reply.code(200).send();
  } catch (e) {
    return fail(reply, e, "Error replacing questions");
  }
}

export async function importAllowedEmailIdsHandler(
  request: FastifyRequest<{ Params: QuestionRouteParams }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const id = request.params.id;
    const question = await getQuestionById(surveyId, id);
    const languages = (await getSurveyById(surveyId)).languages;
    if (!question) {
      reply.code(404).send({ error: "Question not found" });
    } else {
      const file = await request.file();
      const allowedEmails = (await getAllowedEmailsFromFile(file!)) as Array<string>;
      if (allowedEmails) {
        for (const lang of languages) {
          const existingEmails = question.features?.[lang]?.allowedEmails || [];
          const remainingEmails = allowedEmails.filter((email) => !existingEmails?.includes(email));
          question.features = {
            ...question?.features,
            [lang]: {
              ...question?.features?.[lang],
              isRestricted: existingEmails.length || remainingEmails.length ? true : false,
              allowedEmails: [...existingEmails, ...remainingEmails],
            },
          };
        }
        await updateQuestion(surveyId, id, question as unknown as UpdateQuestionInput);
        reply.code(200).send();
      } else {
        reply.code(500).send({ error: "Something went wrong" });
      }
    }
  } catch (e) {
    log.error({ err: e }, "Error importing allowed email ids");
    reply
      .code(500)
      .send({ error: (e instanceof Error ? e.message : undefined) || "Something went wrong" });
  }
}
