import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByContactIdParams,
  createMultipleContactInput,
  deleteManyContactsInput,
  updateContactSchema,
  ContactCore,
} from "./contact.schema.js";
import {
  createContact,
  createMultipleContacts,
  deleteContactById,
  deleteManyContacts,
  getContactById,
  getContactsByOrgId,
  updateContactById,
} from "./contact.service.js";
import { Prisma } from "../../../../../../../generated/prisma/client.js";
import { log } from "../../../../../../utils/logger.js";

export async function createContactHandler(
  request: FastifyRequest<{ Body: ContactCore }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const contact = await createContact({ ...request.body, orgId });
    reply.code(201).send(contact);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.code(500).send({ error: "Contact already exist" });
      }
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function createMultipleContactsHandler(
  request: FastifyRequest<{ Body: createMultipleContactInput }>,
  reply: FastifyReply,
) {
  try {
    const newContacts = request.body;
    const { orgId } = request.user;
    const existingcontacts = await getContactsByOrgId(orgId);
    const filterNewContacts = newContacts.filter((contact) => {
      return !existingcontacts.some(
        (existContact) => existContact.phone === contact.phone,
      );
    });
    if (!filterNewContacts.length)
      throw new Error("All contacts already exist");
    const res = await createMultipleContacts(newContacts, orgId);
    reply.code(201).send(res);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: error.message || "Something went wrong" });
  }
}

export async function getAllContactsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const contacts = await getContactsByOrgId(orgId);
    return reply.code(200).send(contacts);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getContactByIdHandler(
  request: FastifyRequest<{ Params: ByContactIdParams }>,
  reply: FastifyReply,
) {
  try {
    const contact = await getContactById(request.params.contactId);
    return reply.code(200).send(contact);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function deleteContactByIdHandler(
  request: FastifyRequest<{ Params: ByContactIdParams }>,
  reply: FastifyReply,
) {
  try {
    const contact = await deleteContactById(request.params.contactId);
    return reply.code(200).send(contact);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function updateContactByIdHandler(
  request: FastifyRequest<{
    Params: ByContactIdParams;
    Body: updateContactSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const contact = await updateContactById(
      request.params.contactId,
      request.body,
    );
    return reply.code(200).send(contact);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.code(500).send({ error: "Contact already exist" });
      }
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function deleteManyContactsHandler(
  request: FastifyRequest<{ Body: deleteManyContactsInput }>,
  reply: FastifyReply,
) {
  try {
    const { contactIds } = request.body;
    const res = await deleteManyContacts(contactIds);
    return reply.code(200).send(res);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}
