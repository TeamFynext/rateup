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

// The external create route accepts one contact or a batch and stamps `source` before
// delegating to the internal handler, which owns the actual create logic.
export async function createContactsExternalController(
  request: FastifyRequest<{
    Body:
      | (ExtCreateContactSchema & { source?: string })
      | (ExtCreateContactSchema & {
          source?: string;
        })[];
  }>,
  reply: FastifyReply,
) {
  if (Array.isArray(request.body)) {
    request.body.forEach((contact) => {
      contact.source = "external";
    });
    return createMultipleContactsHandler(
      request as unknown as Parameters<typeof createMultipleContactsHandler>[0],
      reply,
    );
  }

  request.body.source = "external";
  return createContactHandler(
    request as unknown as Parameters<typeof createContactHandler>[0],
    reply,
  );
}

export async function getAllContactsExternalController(
  request: Parameters<typeof getAllContactsHandler>[0],
  reply: FastifyReply,
) {
  return getAllContactsHandler(request, reply);
}

export async function getContactByIdExternalController(
  request: Parameters<typeof getContactByIdHandler>[0],
  reply: FastifyReply,
) {
  return getContactByIdHandler(request, reply);
}

export async function updateContactByIdExternalController(
  request: Parameters<typeof updateContactByIdHandler>[0],
  reply: FastifyReply,
) {
  return updateContactByIdHandler(request, reply);
}

export async function deleteContactByIdExternalController(
  request: Parameters<typeof deleteContactByIdHandler>[0],
  reply: FastifyReply,
) {
  return deleteContactByIdHandler(request, reply);
}
