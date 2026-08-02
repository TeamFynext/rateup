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
    // A fixed message: this endpoint carries no authentication, and the raw text
    // handed the caller whatever the driver put in it — a prisma error naming the
    // table and column, or the queue's own failure. See issues.txt 22.6.
    log.error(e);
    reply.code(500).send({ success: false, message: "Something went wrong" });
    return;
  }

  // The same body whether the submission was stored or the honeypot caught it, and
  // no row echoed back — two requests used to be enough to tell a real submission
  // (`data` is an object) from a tripped honeypot (`data` is the string "Error").
  // See issues.txt 22.2.
  reply.code(201).send({ success: true });
}
