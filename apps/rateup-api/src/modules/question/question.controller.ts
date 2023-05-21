import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateQuestionInput,
  QuestionRouteParams,
  QuestionsRouteParams,
  UpdateQuestionInput,
  UpdateQuestionsOrderInput,
} from "./question.schema";
import {
  createQuestion,
  deleteQuestionById,
  getQuestionById,
  getQuestionsBySurveyId,
  reorderQuestions,
  updateQuestion,
} from "./question.service";
import { Prisma } from "@prisma/client";
import { hasAccessToSurvey } from "../../utils/auth";

export async function createQuestionHandler(
  request: FastifyRequest<{
    Body: CreateQuestionInput;
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply
) {
  const body = request.body;
  try {
    const surveyId = request.params.surveyId;
    const question = await createQuestion(surveyId, body);
    reply.code(201).send(question);
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function getQuestionByIdHandler(
  request: FastifyRequest<{
    Params: QuestionRouteParams;
  }>,
  reply: FastifyReply
) {
  try {
    const surveyId = request.params.surveyId;
    const question = await getQuestionById(surveyId, request.params.id);

    if (!question) {
      reply.code(404);
    } else {
      reply.send(question);
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function getQuestionsBySurveyIdHandler(
  request: FastifyRequest<{
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply
) {
  try {
    const questions = await getQuestionsBySurveyId(request.params.surveyId);
    reply.send(questions);
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function deleteQuestionByIdHandler(
  request: FastifyRequest<{
    Params: QuestionRouteParams;
  }>,
  reply: FastifyReply
) {
  try {
    const surveyId = request.params.surveyId;
    const question = await getQuestionById(surveyId, request.params.id);

    if (!question) {
      reply.code(404);
    } else {
      await deleteQuestionById(surveyId, request.params.id);
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function reorderQuestionsHandler(
  request: FastifyRequest<{
    Body: UpdateQuestionsOrderInput;
    Params: QuestionsRouteParams;
  }>,
  reply: FastifyReply
) {
  try {
    const surveyId = request.params.surveyId;
    const userId = request.session.getUserId();
    // TODO: add as prehandler?
    if (!(await hasAccessToSurvey(surveyId, userId))) {
      reply.code(403).send({
        message: `You don't have access to survey with id ${surveyId}`,
      });
      return;
    }
    await reorderQuestions(surveyId, request.body);
    reply.code(200).send();
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function updateQuestionHandler(
  request: FastifyRequest<{
    Body: UpdateQuestionInput;
    Params: QuestionRouteParams;
  }>,
  reply: FastifyReply
) {
  try {
    const surveyId = request.params.surveyId;
    const id = request.params.id;
    // check if question exists
    const question = await getQuestionById(surveyId, id);
    if (!question) {
      reply.code(404);
    } else {
      // check if user has access to survey
      const userId = request.session.getUserId();
      if (!(await hasAccessToSurvey(surveyId, userId))) {
        reply.code(403).send({
          message: `You don't have access to survey with id ${surveyId}`,
        });
        return;
      }

      // update question
      await updateQuestion(surveyId, id, request.body);
      reply.code(200).send();
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}
