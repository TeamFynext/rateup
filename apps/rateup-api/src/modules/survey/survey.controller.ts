import { FastifyReply, FastifyRequest } from "fastify";
import {
  createSurvey,
  deleteSurveyById,
  getSurveyById,
  getSurveysByTeam,
  getSurveysByUserId,
  updateSurveyById,
} from "./survey.service";
import { CreateSurveyInput, GetSurveyByIdParams, UpdateSurveyInput } from "./survey.schema";

export async function createSurveyHandler(
  request: FastifyRequest<{
    Body: CreateSurveyInput;
  }>,
  reply: FastifyReply
) {
  const data = request.body;
  try {
    // TODO add types for session
    const userId = request.session.getUserId();
    const survey = await createSurvey(data, userId);
    reply.code(201).send(survey);
  } catch (e) {
    console.error(e);
    reply.code(500).send();
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
    reply.code(500);
  }
}

export async function getSurveyByTeamHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const survey = await getSurveysByTeam(request.params.id);
    if (!survey) {
      reply.code(404);
    } else {
      reply.send(survey);
    }
  } catch (e) {
    reply.code(500);
  }
}

export async function getSurveysHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = request.session.getUserId();
    const surveys = await getSurveysByUserId(userId)
    reply.send(surveys);
  } catch (e) {
    console.error(e)
    reply.code(500);
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

export async function updateSurveyByIdHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
    Body: UpdateSurveyInput;
  }>,
  reply: FastifyReply
) {
  try {
    // TODO: By using prisma error codes, we can return 404 if the survey doesn't exist and remove this check.
    const survey = await getSurveyById(request.params.id);
    if (!survey) {
      reply.code(404);
    } else {
      await updateSurveyById(request.params.id, request.body);
      reply.code(200);
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}
