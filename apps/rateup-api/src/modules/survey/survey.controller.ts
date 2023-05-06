import { FastifyReply, FastifyRequest } from "fastify";
import {
  createSurvey,
  deleteSurveyById,
  getSurveyById,
} from "./survey.service";
import { CreateSurveyInput, GetSurveyByIdParams } from "./survey.schema";

export async function createSurveyHandler(
  request: FastifyRequest<{
    Body: CreateSurveyInput;
  }>,
  reply: FastifyReply
) {
  const body = request.body;
  try {
    const survey = await createSurvey(body);
    return reply.code(201).send(survey);
  } catch (e) {
    // TODO
    console.error(e);
    return reply.code(500);
  }
}

export async function getSurveyByIdHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const survey = await getSurveyById(request.params.id);
    if (!survey) {
      reply.code(404);
    } else {
      reply.send(survey);
    }
  } catch (e) {
    reply.send(500);
  }
}

export async function deleteSurveyByIdHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const survey = await getSurveyById(request.params.id);
    if (!survey) {
      reply.code(404);
    } else {
      await deleteSurveyById(request.params.id);
      reply.code(200);
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}
