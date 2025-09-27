import { FastifyRequest, FastifyReply } from "fastify";
import { ExtCreateContactSchema } from "./contact.external.schema";
import {
  createContactHandler,
  createMultipleContactsHandler,
} from "../../../contact/contact.controller";

export async function extCreateContactHandler(
  request: FastifyRequest<{ Body: ExtCreateContactSchema; Querystring: {} }>,
  reply: FastifyReply,
) {
  // Set the source to external
  //@ts-ignore
  request.body.source = "external";

  await createContactHandler(request, reply);
}

export async function extCreateMultipleContactsHandler(
  request: FastifyRequest<{ Body: ExtCreateContactSchema[] }>,
  reply: FastifyReply,
) {
  // Set the source to external
  //@ts-ignore
  request.body.forEach((contact) => (contact.source = "external"));

  await createMultipleContactsHandler(request, reply);
}
