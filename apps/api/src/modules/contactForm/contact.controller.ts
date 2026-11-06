import { FastifyReply, FastifyRequest } from "fastify";
import { CreateContactMessageInput } from "./contact.schema.js";
import { createMsg } from "./contact.service.js";
import { log } from "../../utils/logger.js";

export async function createContactMsgHandler(
  request: FastifyRequest<{
    Body: CreateContactMessageInput;
  }>,
  reply: FastifyReply,
) {
  try {
    await createMsg(request.body);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ success: false, message: "Something went wrong" });
    return;
  }

  reply.code(201).send({ success: true });
}
