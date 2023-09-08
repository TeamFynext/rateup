import { FastifyReply, FastifyRequest } from "fastify";
import { CreateResponseInput, GetResponsesParams, DeleteResponseParamsSchema } from "./response.schema";
import { createResponse, deleteResponse, fetchLocationFromIpAndUpdateResponse, getResponses, resetResponsesStats } from "./response.service";

export async function getResponsesHandler(
  request: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  reply: FastifyReply
) {
  try {
    const surveyId = request.params.surveyId;
    const responses = await getResponses(surveyId);
    reply.send(responses);
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}

export async function resetResponsesHandler(
  request: FastifyRequest<{
    Params: GetResponsesParams;
  }>,
  reply: FastifyReply
) {
  try {
    const surveyId = request.params.surveyId;
    const reset = await resetResponsesStats(surveyId);
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
  reply: FastifyReply
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
  reply: FastifyReply
) {
  const data = request.body;
  try {
    const response = await createResponse(data);
    reply.code(201).send(response);

    // checking location information after response is created since we dont
    // want to leave the user waiting
    if (data.platform === "WHATSAPP") {
      // TODO: check if its possible to get location from whatsapp
    } else {
      const coords = response.locationCoordinates as { latitude: number, longitude: number } || null;
      if (!coords || !coords.latitude) {
        await fetchLocationFromIpAndUpdateResponse(request.ip, response.id)
      }
    }
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}
