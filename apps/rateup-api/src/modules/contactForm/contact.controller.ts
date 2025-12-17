import { FastifyReply, FastifyRequest } from "fastify";
import { CreateContactMessageInput } from "./contact.schema.js";
import { createMsg } from "./contact.service.js";

export async function createContactMsgHandler(
  request: FastifyRequest<{
    Body: CreateContactMessageInput;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  let contactMsg;

  try {
    contactMsg = await createMsg(body);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  reply.code(201).send({ success: true, data: contactMsg });
}
