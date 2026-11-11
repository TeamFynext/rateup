import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import { handleFacebookWebhook } from "./facebook.service.js";

export async function facebookWebhookEventHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as FacebookWebhookBody;

    log.trace("[Facebook] Received webhook event => %o", body);

    // Verify this is a page event
    const obj = body.object;
    if (obj !== "page") {
      log.trace("[Facebook] Event object is not 'page', ignoring");
      return reply.code(200).send();
    }

    // Processed BEFORE acknowledging, so a failure can be reported to Meta and retried.
    // This used to send 200 first and process afterwards: `reply.sent` was already true
    // by the time anything threw, so the catch could only log, and Meta — which retries
    // only on a non-2xx — treated a lost message as delivered.
    const data = body as FacebookWebhookBody;
    const { processed, failed } = await handleFacebookWebhook(data);

    if (failed > 0) {
      // Meta retries the whole batch, so events that already succeeded are seen again.
      // handleFacebookMessages guards on the Meta message id to avoid storing those
      // twice — see the note there; it is advisory until messageId has a unique index.
      log.error(
        { processed, failed },
        "[Facebook] Some webhook events failed; answering non-2xx so Meta retries",
      );
      return reply.code(500).send();
    }

    reply.code(200).send();
  } catch (e) {
    log.error({ err: e }, "[Facebook] Error in webhook event handler");
    if (!reply.sent) {
      reply.code(500).send();
    }
  }
}
