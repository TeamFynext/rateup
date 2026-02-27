import { FastifyReply, FastifyRequest } from "fastify";
import {
  createContactHandler,
  createMultipleContactsHandler,
  deleteContactByIdHandler,
  getAllContactsHandler,
  getContactByIdHandler,
  updateContactByIdHandler,
} from "../../../modules/contact/contact.controller.js";
import { ExtCreateContactSchema } from "../contact-groups/contact.external.schema.js";

export async function createContactsExternalController(
  request: FastifyRequest<{
    Body: ExtCreateContactSchema | ExtCreateContactSchema[];
  }>,
  reply: FastifyReply,
) {
  if (Array.isArray(request.body)) {
    request.body.forEach((contact) => {
      (contact as any).source = "external";
    });
    return createMultipleContactsHandler(request as any, reply);
  }

  (request.body as any).source = "external";
  return createContactHandler(request as any, reply);
}

export async function getAllContactsExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getAllContactsHandler(request as any, reply);
}

export async function getContactByIdExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getContactByIdHandler(request as any, reply);
}

export async function updateContactByIdExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return updateContactByIdHandler(request as any, reply);
}

export async function deleteContactByIdExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return deleteContactByIdHandler(request as any, reply);
}
