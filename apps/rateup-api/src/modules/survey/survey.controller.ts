import { FastifyReply, FastifyRequest } from "fastify";
import {
  cloneSurvey,
  createSurvey,
  createSurveyLanding,
  deleteSurveyById,
  getActiveSurveysSummmaryByUserId,
  getGoogleUrlBySurveyId,
  getSurveyById,
  getSurveyBylandingId,
  getSurveyLandingByUserId,
  getSurveysByTeam,
  getSurveysByUserId,
  getWebSurveysByUserId,
  getWhatsappSurveysByUserId,
  updateCompletedSurvey,
  updateGoogleLink,
  updateStartedSurvey,
  updateSurveyById,
  updateSurveyLanding,
  updateSurveyPassword,
  updateVisitedSurvey,
  verifySurveyPassword,
} from "./survey.service";
import {
  CloneSurveyInput,
  CreateSurveyInput,
  CreateSurveyLandingInput,
  GetSurveyByIdParams,
  IdParamInput,
  UpdateGoogleLinkInput,
  UpdateSurveyInput,
  UpdateSurveyPassword,
} from "./survey.schema";
import Session from "supertokens-node/recipe/session";
import { Prisma } from '@prisma/client';
import { getLandingPageById } from "../landingPage/landingpage.service";

export async function createSurveyHandler(
  request: FastifyRequest<{
    Body: CreateSurveyInput;
  }>,
  reply: FastifyReply
) {
  const data = request.body;
  try {
    const survey = await createSurvey(data, request.userId);
    reply.code(201).send(survey);
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}

//------------create survey landing handler--------------
export async function createSurveyLandingHandler(
  request: FastifyRequest<{
    Body: CreateSurveyLandingInput;
  }>,
  reply: FastifyReply
) {
  const data = request.body;

  // console.log("caretesurvye--213", data);
  try {
    const survey = await createSurveyLanding(data, request.userId);
    reply.code(201).send(survey);
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}
//------------update survey landing handler--------------
export async function updateSurveyLandingHandler(
  request: FastifyRequest<{
    Body: CreateSurveyLandingInput;
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply
) {
  const data = request.body;

  try {
    let landingId = request.params.id

    const survey = await updateSurveyLanding(landingId, data);
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
//---------------get landing page by id ----------
export async function getLandingPageByIdHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const survey = await getLandingPageById(request.params.id);
    if (!survey) {
      reply.code(404);
    } else {
      reply.send(survey);
    }
  } catch (e) {
    reply.code(500);
  }
}



//-----------get survey by landingid------------
export async function getSurveyBylandingIdhandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const survey = await getSurveyBylandingId(request.params.id);
    if (!survey) {
      reply.code(404);
    } else {
      reply.send(survey);
    }
  } catch (e) {
    reply.code(500);
  }
}

export async function fetchGoogleUrlBySurveyIdHandler(
  request: FastifyRequest<{
    Params: IdParamInput;
  }>,
  reply: FastifyReply
) {
  let url;

  try {
    url = await getGoogleUrlBySurveyId(request.params.id);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  if ("error" in url) {
    reply.code(404).send({ success: false, data: url });
  } else {
    reply.code(201).send({ success: true, data: url });
  }
}

export async function cloneSurveyHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
    Body: CloneSurveyInput;
  }>,
  reply: FastifyReply
) {
  let teamId = request?.body?.teamId;
  let survey;
  try {
    survey = await cloneSurvey(request.params.id, request.userId, teamId);

    // Check if the survey is an error message
    if (typeof survey === "string") {
      reply.code(400).send({ success: false, message: survey });
      return;
    }
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  reply.code(201).send({ success: true, data: survey });
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
    // console.log("gtsurvey");
    //const userId = request.session.getUserId();
    const surveys = await getSurveysByUserId(request.userId);
    reply.send(surveys);
  } catch (e) {
    console.error(e);
    reply.code(500);
  }
}
export async function getWebSurveysHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const surveys = await getWebSurveysByUserId(request.userId);
    reply.send(surveys);
  } catch (e) {
    console.error(e);
    reply.code(500);
  }
}

export async function getActiveSurveysSummaryHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = request.userId;
    const surveys = await getActiveSurveysSummmaryByUserId(userId);
    reply.send(surveys);
  } catch (e) {
    console.error(e);
    reply.code(500);
  }
}

//----------get survey landing -----------
export async function getSurveysLandingHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    let session = await Session.getSession(request, reply);
    const surveys = await getSurveyLandingByUserId(request.userId);
    reply.send(surveys);
  } catch (e) {
    console.error(e);
    reply.code(500);
  }
}

//------------get whatsapp surveys -------
//--------@author:harshad
export async function getWhatsappSurveysHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    let type = "whatsapp";
    const surveys = await getWhatsappSurveysByUserId(request.userId, type);
    reply.send(surveys);
  } catch (e) {
    console.error(e);
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
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      reply.code(400).send({
        error: 'Cannot delete Survey because it has associated responses. Cleanup responses and Try Again!'
      });
    } else {
      reply.code(500).send({
        error: 'An unknown error occurred.'
      });
    }
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
      let response = await updateSurveyById(request.params.id, request.body);
      reply.code(200).send(response);
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
      reply
        .code(200)
        .send({ message: "Password Changes Updated successfully." });
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
    const verifyPassword = await verifySurveyPassword(
      request.params.id,
      request.body
    );
    if (!verifyPassword) {
      reply.code(404);
    } else {
      reply.code(200).send({ status: "success", data: verifyPassword });
    }
  } catch (e) {
    reply.code(500).send({ status: "error", message: e });
  }
}

export async function visitedSurveyHandler(
  request: FastifyRequest<{
    Params: IdParamInput;
  }>,
  reply: FastifyReply
) {
  try {
    const updateVisited = await updateVisitedSurvey(request.params.id);
    if (!updateVisited) {
      reply.code(404);
    } else {
      reply.code(200).send({ status: "success" });
    }
  } catch (e) {
    reply.code(500).send({ status: "error", message: e });
  }
}

export async function startedSurveyHandler(
  request: FastifyRequest<{
    Params: IdParamInput;
  }>,
  reply: FastifyReply
) {
  try {
    const updateStarted = await updateStartedSurvey(request.params.id);
    if (!updateStarted) {
      reply.code(404);
    } else {
      reply.code(200).send({ status: "success" });
    }
  } catch (e) {
    reply.code(500).send({ status: "error", message: e });
  }
}

export async function completedSurveyHandler(
  request: FastifyRequest<{
    Params: IdParamInput;
  }>,
  reply: FastifyReply
) {
  try {
    const updateCompleted = await updateCompletedSurvey(request.params.id);
    if (!updateCompleted) {
      reply.code(404);
    } else {
      reply.code(200).send({ status: "success" });
    }
  } catch (e) {
    reply.code(500).send({ status: "error", message: e });
  }
}

export async function updateGoogleLinkHandler(
  request: FastifyRequest<{
    Params: IdParamInput;
    Body: UpdateGoogleLinkInput;
  }>,
  reply: FastifyReply
) {
  try {
    const survey = await getSurveyById(request.params.id);
    if (!survey) {
      reply.code(404).send({ message: "Survey not found." });
    } else {
      await updateGoogleLink(request.params.id, request.body);
      reply.code(200).send({
        message: "Success",
        data: "Google Link Updated successfully.",
      });
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}
