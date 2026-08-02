import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import { handleInstagramWebhook } from "./instagram.service.js";

export async function instagramWebhookEventHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    log.trace({ body: request.body }, "recieved instgram webhook");
    if (request.body === null || typeof request.body !== "object") {
      throw new TypeError("Instagram webhook body is not an object");
    }
    const obj = (request.body as { object?: string }).object;
    if (obj !== "instagram" && obj !== "page") {
      return reply.code(200).send();
    }
    // Processed BEFORE acknowledging, so a failure can be reported to Meta and
    // retried. This used to send 200 first and process afterwards: `reply.sent`
    // was already true by the time anything threw, so the catch could only log,
    // and Meta — which retries only on a non-2xx — treated a lost message as
    // delivered. Matches the Facebook webhook (issues.txt 10.6).
    // See issues.txt 12.2.
    const data = request.body as InstagramWebhookBody;
    const { processed, failed } = await handleInstagramWebhook(data);

    if (failed > 0) {
      // Meta retries the whole batch, so events that already succeeded are seen
      // again. handleWaMessages does not deduplicate on the Meta message id —
      // that is issues.txt 10.14, and it applies here too.
      log.error(
        { processed, failed },
        "[Instagram] Some webhook events failed; answering non-2xx so Meta retries",
      );
      return reply.code(500).send();
    }

    reply.code(200).send();
  } catch (e) {
    log.error(e);
    if (!reply.sent) {
      reply.code(500).send();
    }
  }
}
