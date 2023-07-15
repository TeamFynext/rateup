import { FastifyReply, FastifyRequest } from "fastify";
import {
  cloneSurvey,
  createSurvey,
  deleteSurveyById,
  getSurveyById,
  getSurveysByTeam,
  getSurveysByUserId,
  updateSurveyById,
  updateSurveyPassword,
  verifySurveyPassword,
} from "./survey.service";
import { CreateSurveyInput, GetSurveyByIdParams, UpdateSurveyInput, UpdateSurveyPassword } from "./survey.schema";
import Session from "supertokens-node/recipe/session";

export async function createSurveyHandler(
  request: FastifyRequest<{
    Body: CreateSurveyInput;
  }>,
  reply: FastifyReply
) {
  const data = request.body;
  try {
    // TODO add types for session
    //const userId = request.session.getUserId();
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();
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

export async function cloneSurveyHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply
) {
  let session = await Session.getSession(request, reply);
  let userId = session.getUserId();

  let survey;
  try {
    survey = await cloneSurvey(request.params.id, userId);

    // Check if the survey is an error message
    if (typeof survey === 'string') {
      reply.code(400).send({ success: false, message: survey });
      return;
    }

  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  reply.code(201).send({ success: true, data: survey});
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
    //const userId = request.session.getUserId();
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();
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


export async function updateSurveyPasswordHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
    Body: UpdateSurveyPassword;
  }>,
  reply: FastifyReply
) {
  try {
    const survey = await getSurveyById(request.params.id);
    if (!survey) {
      reply.code(404);
    } else {
      await updateSurveyPassword(request.params.id, request.body);
      reply.code(200).send({ message: "Password Changes Updated successfully." });
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}

export async function verifySurveyPasswordHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
    Body: UpdateSurveyPassword;
  }>,
  reply: FastifyReply
) {
  try {
      const verifyPassword = await verifySurveyPassword(request.params.id, request.body);
      if (!verifyPassword) {
        reply.code(404);
      } else {
        reply.code(200).send({ status: "success", data: verifyPassword});
      }
    } catch (e) {
    reply.code(500).send({status: "error", message: e});
  }
}
