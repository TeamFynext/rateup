import { FastifyReply, FastifyRequest } from "fastify";
import { CreateQuestionInput, QuestionIdParams } from "./question.schema";
import {
  createQuestion,
  deleteQuestionById,
  getQuestionById,
  getQuestionsBySurveyId,
} from "./question.service";
import { Prisma } from "@prisma/client";

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
      reply.code(200);
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}
