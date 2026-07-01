import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import { handleInstagramWebhook } from "./instagram.service.js";

export async function instagramWebhookEventHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    log.trace(`recieved instgram webhook => %o`, request.body);
    const obj = (request.body as any).object;
    if (obj !== "instagram" && obj !== "page") {
      return reply.code(200).send();
    }
    reply.code(200).send();
    const data = request.body as InstagramWebhookBody;
    await handleInstagramWebhook(data);
  } catch (e) {
    log.error(e);
    if (!reply.sent) {
      reply.code(500).send();
    }
  }
}
