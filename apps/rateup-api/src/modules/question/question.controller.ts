import { FastifyReply, FastifyRequest } from "fastify";
import { CreateQuestionInput, QuestionIdParams, UpdateQuestionInput, UpdateQuestionsOrderInput } from "./question.schema";
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
  }>,
  reply: FastifyReply
) {
  const body = request.body;
  try {
    const question = await createQuestion(body);
    reply.code(201).send(question);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2003") {
        reply.code(404).send({
          message: `Could not find survey with surveyId ${body.surveyId}`,
        });
        return;
      }
    }
    reply.code(500);
  }
}

export async function getQuestionByIdHandler(
  request: FastifyRequest<{
    Params: QuestionIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const question = await getQuestionById(request.params.id);
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

export async function getQuestionBySurveyIdHandler(
  request: FastifyRequest<{
    Params: QuestionIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const questions = await getQuestionsBySurveyId(request.params.id);
    if (!questions) {
      reply.code(404);
    } else {
      reply.send(questions);
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function deleteQuestionByIdHandler(
  request: FastifyRequest<{
    Params: QuestionIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const question = await getQuestionById(request.params.id);
    if (!question) {
      reply.code(404);
    } else {
      await deleteQuestionById(request.params.id);

      // updating order
      const questions = await getQuestionsBySurveyId(question.surveyId);
      const newOrder = questions.sort((a, b) => a.order - b.order).map((q) => q.id);
      await reorderQuestions(question.surveyId, newOrder);
      reply.code(200);
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function reorderQuestionsHandler(
  request: FastifyRequest<{
    Body: UpdateQuestionsOrderInput;
    Params: { surveyId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const surveyId = request.params.surveyId;
    const userId = request.session.getUserId();
    // TODO: add as prehandler?
    if (! await hasAccessToSurvey(surveyId, userId)) {
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
    Params: QuestionIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    // check if question exists
    const question = await getQuestionById(request.params.id);
    if (!question) {
      reply.code(404);
    } else {
      // check if user has access to survey
      const surveyId = question.surveyId;
      const userId = request.session.getUserId();
      if (! await hasAccessToSurvey(surveyId, userId)) {
        reply.code(403).send({
          message: `You don't have access to survey with id ${surveyId}`,
        });
        return;
      }
      // update question
      const updatedQuestion = await updateQuestion(request.params.id, request.body);
      reply.code(200).send();
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}