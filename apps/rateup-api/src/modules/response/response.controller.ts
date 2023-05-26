import { FastifyReply, FastifyRequest } from "fastify";
import { CreateResponseInput, GetResponsesParams } from "./response.schema";
import { createResponse, getResponses } from "./response.service";

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
    } catch (e) {
        console.error(e);
        reply.code(500).send();
    }
}
