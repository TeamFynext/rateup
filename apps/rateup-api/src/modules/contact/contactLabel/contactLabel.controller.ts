import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../utils/logger";
import {
  CreateContactLabelSchema,
  UpdateContactLabelSchema,
  ByLabelIdSchema,
  AssignLabelsToContactSchema,
  AssignLabelsToContactsSchema,
} from "./contactLabel.schema";
import {
  createContactLabel,
  getContactLabelsByOrgId,
  getContactLabelById,
  updateContactLabel,
  deleteContactLabel,
  assignLabelsToContact,
  getContactsWithLabels,
  assignLabelsToContacts,
} from "./contactLabel.service";
import { ByContactIdParams } from "../contact.schema";
import { Prisma } from "../../../../generated/prisma/client";

export async function createContactLabelHandler(
  request: FastifyRequest<{
    Body: Required<Pick<CreateContactLabelSchema, "name">>;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const label = await createContactLabel(orgId, request.body);
    reply.code(201).send(label);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.code(409).send({ error: "Label with this name already exists" });
      }
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function getAllContactLabelsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const labels = await getContactLabelsByOrgId(orgId);
    reply.code(200).send(labels);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getContactLabelByIdHandler(
  request: FastifyRequest<{ Params: ByLabelIdSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { labelId } = request.params;
    const label = await getContactLabelById(labelId, orgId);

    if (!label) {
      return reply.code(404).send({ error: "Label not found" });
    }

    reply.code(200).send(label);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function updateContactLabelHandler(
  request: FastifyRequest<{
    Params: ByLabelIdSchema;
    Body: UpdateContactLabelSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { labelId } = request.params;
    const label = await updateContactLabel(labelId, orgId, request.body);
    reply.code(200).send(label);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.code(409).send({ error: "Label with this name already exists" });
      } else if (error.code === "P2025") {
        reply.code(404).send({ error: "Label not found" });
      }
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function deleteContactLabelHandler(
  request: FastifyRequest<{ Params: ByLabelIdSchema }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { labelId } = request.params;
    const label = await deleteContactLabel(labelId, orgId);
    reply.code(200).send(label);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        reply.code(404).send({ error: "Label not found" });
      }
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function assignLabelsToContactHandler(
  request: FastifyRequest<{
    Params: ByContactIdParams;
    Body: AssignLabelsToContactSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { contactId } = request.params;
    const { labelIds } = request.body;

    const contact = await assignLabelsToContact(contactId, labelIds, orgId);

    if (!contact) {
      return reply.code(404).send({ error: "Contact not found" });
    }

    reply.code(200).send(contact);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function getContactsWithLabelsHandler(
  request: FastifyRequest<{
    Querystring: { labelIds?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const labelIds = request.query.labelIds
      ? request.query.labelIds.split(",")
      : undefined;

    const contacts = await getContactsWithLabels(orgId, labelIds);
    reply.code(200).send(contacts);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function assignLabelsToContactsHandler(
  request: FastifyRequest<{
    Params: ByContactIdParams;
    Body: AssignLabelsToContactsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { labelIds, contactIds } = request.body;
    const contact = await assignLabelsToContacts(contactIds, labelIds, orgId);
    reply.code(200).send(contact);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}
