import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import { handleFacebookWebhook } from "./facebook.service.js";

export async function facebookWebhookEventHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as any;

    log.trace("[Facebook] Received webhook event => %o", body);

    // Verify this is a page event
    const obj = body.object;
    if (obj !== "page") {
      log.trace("[Facebook] Event object is not 'page', ignoring");
      return reply.code(200).send();
    }

    // Acknowledge the webhook immediately
    reply.code(200).send();

    // Process the webhook asynchronously
    const data = body as FacebookWebhookBody;
    await handleFacebookWebhook(data);
  } catch (e) {
    log.error("[Facebook] Error in webhook event handler: %o", e);
    reply.code(500).send();
  }
}
