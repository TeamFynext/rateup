import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateResponseInput,
  GetResponsesParams,
  DeleteResponseParamsSchema,
  GenerateBodyInput,
  generateXlsxBody,
} from "./response.schema";
import {
  createResponse,
  deleteResponse,
  downloadExcelResponse,
  generateResponse,
  getAllResponses,
  getResponses,
  resetResponsesStats,
  saveResponseToGoogleSheet,
  sendEmailOnResponseCreation,
  syncResponseToGoogleSheet,
  updateResponse,
} from "./response.service";
import { fetchLocation } from "../../utils/location";
import { getIp } from "../../utils/http";
import Session from "supertokens-node/recipe/session";
import { getTeamIdsByUserId } from "../team/team.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { QuestionType } from "../../types/enums";
import { createTestimonial } from "../testimonial/testimonial.service";
import { getQuestionsBySurveyId } from "../question/question.service";

export async function getResponsesHandler(
  request: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyTeamMapId = request.params.surveyTeamMapId;
    const responses = await getResponses(surveyTeamMapId);
    reply.send(responses);
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}

export async function getAllResponsesHandler(
  request: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);
    const userId = session.getUserId();
    const teamIds = await getTeamIdsByUserId(userId);
    const surveyId = request.params.surveyId;
    const responses = await getAllResponses(surveyId, teamIds);
    if (responses.length === 0)
      reply.code(404).send({ message: "No responses found" });
    reply.code(200).send(responses);
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}

export async function downloadExcelResponseHandler(
  request: FastifyRequest<{
    Body: generateXlsxBody;
  }>,
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);
    const userId = session.getUserId();
    const teamIds = await getTeamIdsByUserId(userId);
    const surveyId = request.body.surveyId;
    const allResponse = await getAllResponses(surveyId, teamIds);
    const question = await getQuestionsBySurveyId(surveyId);
    const [title, data] = await downloadExcelResponse(
      allResponse,
      question,
      request.body.defaultLanguage,
      request.body.visibleColumn,
      request.body.tz,
    );
    reply.header("filename", `${title}.xlsx`);
    reply.status(200).type("application/xlsx").send(data);
  } catch (e) {
    reply.status(500).send(e);
  }
}

export async function resetResponsesHandler(
  request: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyTeamMapId = request.params.surveyTeamMapId;
    const reset = await resetResponsesStats(surveyTeamMapId);
    reply.code(201).send({ success: true, data: reset });
  } catch (e) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
  }
}

export async function deleteResponseHandler(
  request: FastifyRequest<{
    Params: DeleteResponseParamsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const id = request.params.id;
    const deleteRes = await deleteResponse(id);
    reply.code(201).send({ success: true, data: deleteRes });
  } catch (e) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
  }
}

export async function createResponseHandler(
  request: FastifyRequest<{
    Body: CreateResponseInput;
  }>,
  reply: FastifyReply,
) {
  const { shouldRaiseTicket, ...data } = request.body;

  try {
    const response = await createResponse(data, shouldRaiseTicket);
    reply.code(201).send(response);
    const { surveyTeamMapId, responses, language, createdAt } = response;
    await saveResponseToGoogleSheet({
      surveyTeamMapId,
      responses,
      language,
      createdAt,
    });
    // checking location information after response is created since we dont
    // want to leave the user waiting
    if (data.platform === "WHATSAPP") {
      // TODO: check if its possible to get location from whatsapp
    } else {
      await sendEmailOnResponseCreation(data.surveyTeamMapId, response);
      const coords = (response.location as any)?.coordinates;
      const ip = getIp(request);
      let location = await fetchLocation(coords);
      if (!location) {
        location = undefined;
      }

      await updateResponse(response.id, { ip, location });
      const hasTestimonialResponse = data.responses.some(
        (res) => res?.type === QuestionType.Testimonial,
      );
      if (hasTestimonialResponse) await createTestimonial(data, response.id);
    }
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}
export async function generateResponseHandler(
  request: FastifyRequest<{
    Body: GenerateBodyInput;
  }>,
  reply: FastifyReply,
) {
  try {
    await generateResponse(request.body);
    reply.code(201).send();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError)
      reply.code(400).send("Survey Not Found");
    else reply.code(500).send(e.message);
  }
}

export async function syncResponseToGoogleSheetHandler(
  request: FastifyRequest<{
    Params: {
      surveyId: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyId = request.params.surveyId;
    const orgId = request.user.orgId;
    let survey = await syncResponseToGoogleSheet(surveyId, orgId);
    reply.code(201).send(survey);
  } catch (e) {
    console.log(e);
    if (e instanceof PrismaClientKnownRequestError)
      reply.code(400).send("Survey Not Found");
    else if (e.response.data.error)
      reply.code(500).send({ error: e.response.data.error });
    else reply.code(500).send(e);
  }
}
