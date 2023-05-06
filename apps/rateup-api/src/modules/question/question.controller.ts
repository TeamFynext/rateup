import { FastifyReply, FastifyRequest } from "fastify";
import { CreateQuestionInput, QuestionIdParams } from "./question.schema";
import {
  createQuestion,
  deleteQuestionById,
  getQuestionById,
  getQuestionsBySurveyId,
} from "./question.service";

export async function createQuestionHandler(
  request: FastifyRequest<{
    Body: CreateQuestionInput;
  }>,
  reply: FastifyReply
) {
  try {
    const body = request.body;
    // TODO: check if surveyId is valid
    const question = await createQuestion(body);
    return reply.code(201).send(question);
  } catch (e) {
    console.error(e);
    return reply.code(500);
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
    return reply.code(500);
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
    return reply.code(500);
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
      reply.code(200);
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}
