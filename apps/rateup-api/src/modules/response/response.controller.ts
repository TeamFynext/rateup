import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateResponseInput,
  GetResponsesParams,
  DeleteResponseParamsSchema,
  GenerateBodyInput,
} from "./response.schema";
import {
  createResponse,
  deleteResponse,
  generateResponse,
  getAllResponses,
  getResponses,
  resetResponsesStats,
  sendEmailOnResponseCreation,
  updateResponse,
} from "./response.service";
import { fetchLocation } from "../../utils/location";
import { getIp } from "../../utils/http";
import Session from "supertokens-node/recipe/session";
import { getTeamIdsByUserId } from "../team/team.service";

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
  const data = request.body;
  console.log(data);

  try {
    const response = await createResponse(data);
    reply.code(201).send(response);

    // checking location information after response is created since we dont
    // want to leave the user waiting
    if (data.platform === "WHATSAPP") {
      // TODO: check if its possible to get location from whatsapp
    } else {
      await sendEmailOnResponseCreation(data.surveyTeamMapId, response);
      const coords = (response.location as any)?.coordinates;
      const ip = getIp(request);
      let location = await fetchLocation(ip, coords);
      if (!location) {
        location = undefined;
      }

      await updateResponse(response.id, { ip, location });
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
    reply.code(500).send(e.message);
  }
}
