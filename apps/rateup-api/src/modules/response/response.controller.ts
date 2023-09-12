import { FastifyReply, FastifyRequest } from "fastify";
import { CreateResponseInput, GetResponsesParams, DeleteResponseParamsSchema } from "./response.schema";
import { createResponse, deleteResponse, getResponses, resetResponsesStats, updateResponseLocation } from "./response.service";
import { fetchLocationFromCoordinates, fetchLocationFromIp } from "../../utils/location";
import { log } from "../../utils/logger";

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
      const coords = (response.location as any)?.coordinates as { latitude: number, longitude: number } || null;
      let location = null;
      if (!coords || !coords.latitude) {
        let ip = request.ip
        const forwardedFor = request.headers["x-forwarded-for"] as string || undefined;
        log.info(`IP => ${request.ip} ${request.headers["x-forwarded-for"]}`);

        if (forwardedFor) {
          ip = forwardedFor.split(",")[0];
        }
        location = await fetchLocationFromIp(ip);
      } else {
        location = await fetchLocationFromCoordinates(coords.latitude, coords.longitude);
      }
      if (location) {
        updateResponseLocation(response.id, location);
      }
    }
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}
