import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../utils/logger.js";
import {
  CreateContactLabelSchema,
  UpdateContactLabelSchema,
  ByLabelIdSchema,
  AssignLabelsToContactSchema,
  AssignLabelsToContactsSchema,
} from "./contactLabel.schema.js";
import {
  createContactLabel,
  getContactLabelsByOrgId,
  getContactLabelById,
  updateContactLabel,
  deleteContactLabel,
  assignLabelsToContact,
  getContactsWithLabels,
  assignLabelsToContacts,
} from "./contactLabel.service.js";
import { ByContactIdParams } from "../contact.schema.js";
import { Prisma } from "../../../../generated/prisma/client.js";

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
    // A prisma error with any code OTHER than the one named took the outer branch,
    // matched no inner condition, and the handler returned having sent nothing —
    // so fastify's async wrapper answered an empty 200 and the client read a
    // foreign-key violation as success. Same shape as issues.txt 3.2.
    // See issues.txt 18.17.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      reply.code(409).send({ error: "Label with this name already exists" });
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function getAllContactLabelsHandler(request: FastifyRequest, reply: FastifyReply) {
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
    // See issues.txt 18.17.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      reply.code(409).send({ error: "Label with this name already exists" });
    } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      reply.code(404).send({ error: "Label not found" });
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
    // See issues.txt 18.17.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      reply.code(404).send({ error: "Label not found" });
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
    const labelIds = request.query.labelIds ? request.query.labelIds.split(",") : undefined;

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
    // Reports what it did. It used to send the function's undefined return, so the
    // caller got an empty 200 and could not tell which contacts were updated or
    // whether any id was rejected by the org filter. See issues.txt 18.33.
    const result = await assignLabelsToContacts(contactIds, labelIds, orgId);
    reply.code(200).send(result);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}
