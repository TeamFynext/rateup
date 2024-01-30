import { FastifyReply, FastifyRequest } from "fastify";
import {
  cloneSurvey,
  createSurvey,
  deleteSurveyById,
  deleteSurveyFromTeam,
  getActiveSurveysSummmaryByUserId,
  getGoogleUrlBySurveyTeamMapId,
  getPublicSurveyById,
  getSurveyById,
  getSurveyBylandingId,
  getSurveyLandingByUserId,
  getSurveyStatsBySurveyTeamMapId,
  getSurveyTemplates,
  getSurveysByTeam,
  getSurveysByUserId,
  getWebSurveysByUserId,
  getWhatsappSurveysByUserId,
  updateCompletedSurvey,
  updateGoogleLink,
  updateStartedSurvey,
  updateSurveyById,
  updateSurveyPassword,
  updateVisitedSurvey,
  verifySurveyPassword,
} from "./survey.service";
import {
  CloneSurveyInput,
  CreateSurveyInput,
  DeleteTeamSurveyInput,
  GetSurveyByIdParams,
  GetSurveyTemplatesParams,
  IdParamInput,
  UpdateGoogleLinkInput,
  UpdateSurveyInput,
  UpdateSurveyPassword,
} from "./survey.schema";
import Session from "supertokens-node/recipe/session";
import { Prisma } from "@prisma/client";
import { getLandingPageById } from "../landingPage/landingpage.service";
import { BySurveyTeamMapIdParams } from "../team/team.schema";
import { getTeamIdsByUserId } from "../team/team.service";
import { createDefaultSurveyTheme } from "../surveyTheme/surveyTheme.service";

export async function createSurveyHandler(
  request: FastifyRequest<{
    Body: CreateSurveyInput;
  }>,
  reply: FastifyReply,
) {
  const data = request.body;
  try {
    const survey = await createSurvey(data, request.userId, request.user.email);
    //creating a default survey theme once the survey is created
    if (typeof survey === "object" && survey !== null) {
      console.log(survey);
      await createDefaultSurveyTheme(survey.id);
      reply.code(201).send(survey);
    }
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
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);
    const userId = session.getUserId();
    const teamIds = await getTeamIdsByUserId(userId);
    const survey = await getSurveyById(request.params.id, teamIds);
    if (!survey) {
      reply.code(404);
    } else {
      reply.send(survey);
    }
  } catch (e) {
    reply.code(500);
  }
}

export async function getPublicSurveyByIdHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const survey = await getPublicSurveyById(request.params.id);
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
  reply: FastifyReply,
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
  reply: FastifyReply,
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
    Params: BySurveyTeamMapIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    return await getGoogleUrlBySurveyTeamMapId(request.params.surveyTeamMapId);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }
}

export async function cloneSurveyHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
    Body: CloneSurveyInput;
  }>,
  reply: FastifyReply,
) {
  let teamIds = request?.body?.teamIds;
  let survey;
  try {
    survey = await cloneSurvey(request.params.id, request.userId, teamIds);

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
  reply: FastifyReply,
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
//
export async function getSurveyStatsBySurveyTeamMapIdHandler(
  request: FastifyRequest<{
    Params: { surveyTeamMapId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const survey = await getSurveyStatsBySurveyTeamMapId(
      request.params.surveyTeamMapId,
    );
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
  reply: FastifyReply,
) {
  try {
    const surveys = await getSurveysByUserId(request.userId);
    reply.send(surveys);
  } catch (e) {
    console.error(e);
    reply.code(500);
  }
}
export async function getWebSurveysHandler(
  request: FastifyRequest,
  reply: FastifyReply,
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
  reply: FastifyReply,
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
  reply: FastifyReply,
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
  reply: FastifyReply,
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

//------------get survey templates -------
export async function getSurveyTemplatesHandler(
  request: FastifyRequest<{
    Params: GetSurveyTemplatesParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveys = await getSurveyTemplates(request.params.surveyType);
    reply.send(surveys);
  } catch (e) {
    console.error(e);
    reply.code(500);
  }
}

//------------get delete survey by id -------
export async function deleteSurveyByIdHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply,
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
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2003"
    ) {
      reply.code(400).send({
        error:
          "Cannot delete Survey because it has associated responses. Cleanup responses and Try Again!",
      });
    } else {
      reply.code(500).send({
        error: "An unknown error occurred.",
      });
    }
  }
}

export async function deleteTeamSurveyHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
    Body: DeleteTeamSurveyInput;
  }>,
  reply: FastifyReply,
) {
  try {
    let response = await deleteSurveyFromTeam(request.params.id, request.body);
    if (!response) {
      reply.code(404);
    } else {
      reply
        .code(200)
        .send({ message: "Deleted successfully.", info: response });
    }
    //TODO improve response handling
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
  reply: FastifyReply,
) {
  try {
    // TODO: By using prisma error codes, we can return 404 if the survey doesn't exist.
    let response = await updateSurveyById(request.params.id, request.body);
    reply.code(200).send(response);
  } catch (e) {
    console.log(e);
    reply.code(500).send({ status: "failed", message: e.message });
  }
}

export async function updateSurveyPasswordHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
    Body: UpdateSurveyPassword;
  }>,
  reply: FastifyReply,
) {
  try {
    const survey = await getSurveyById(request.params.id);
    if (!survey) {
      reply.code(404);
    } else {
      const res = await updateSurveyPassword(request.params.id, request.body);
      reply.code(200).send({
        message: "Password Changes Updated successfully.",
        isProtected: res?.isProtected,
      });
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
  reply: FastifyReply,
) {
  try {
    const verifyPassword = await verifySurveyPassword(
      request.params.id,
      request.body,
    );
    if (!verifyPassword) {
      reply.code(404);
    } else {
      reply.code(200).send({ status: "success", data: verifyPassword });
    }
  } catch (e) {
    reply.code(500).send({ status: "error", message: e?.message });
  }
}

export async function visitedSurveyHandler(
  request: FastifyRequest<{
    Params: IdParamInput;
  }>,
  reply: FastifyReply,
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
  reply: FastifyReply,
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
  reply: FastifyReply,
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
  reply: FastifyReply,
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
