import { FastifyReply, FastifyRequest } from "fastify";
import {
  createSurvey,
  deleteSurveyById,
  getSurveyById,
  getSurveys,
} from "./survey.service";
import { CreateSurveyInput, GetSurveyByIdParams } from "./survey.schema";
import { hasAccessToSurvey, hasAccessToTeam } from "../../utils/auth";

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
    const teamId = data.teamId;

    if(! await hasAccessToTeam(teamId, userId)) {
      reply.code(403).send();
      return;
    }

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

export async function getSurveysHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const surveys = await getSurveys();
    reply.send(surveys);
  } catch (e) {
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
