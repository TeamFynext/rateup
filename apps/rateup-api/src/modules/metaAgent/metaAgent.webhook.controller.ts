import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";

/**
 * Meta sends thread-control / agent-event notifications (e.g. control handed back
 * from the AI agent to this app, or agent_event delivery updates) as part of the
 * same WABA webhook subscription used for WhatsApp messages. This endpoint is a
 * dedicated entry point for those "business_ai_agent" style change notifications
 * so they don't have to be parsed inline with the message-handling webhook.
 */
export async function metaAgentWebhookEventHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const body = req.body as any;
    log.info({ body }, "Received Meta Business Agent webhook event");

    const entries = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        log.info(
          { field: change?.field, value: change?.value },
          "Meta Business Agent change notification",
        );
      }
    }

    reply.code(200).send("EVENT_RECEIVED");
  } catch (error) {
    log.error({ err: error }, "Error handling Meta Business Agent webhook event");
    reply.code(200).send("EVENT_RECEIVED");
  }
}
