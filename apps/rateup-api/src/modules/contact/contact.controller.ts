import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByContactIdParams,
  createMultipleContactInput,
  deleteManyContactsInput,
  updateContactSchema,
  ContactCore,
  PaginationQuery,
} from "./contact.schema";
import { log } from "../../utils/logger";
import {
  createContact,
  createMultipleContacts,
  deleteContactById,
  deleteManyContacts,
  getContactById,
  getContactsByOrgId,
  getExistingContactCountByPhno,
  importCSVContacts,
  updateContactById,
} from "./contact.service";
import { Prisma } from "@prisma/client";
import { dataExtractFileMimeTypes } from "../fileUpload/fileUpload.schema";
import { isValidPhoneNumber } from "libphonenumber-js";

export async function createContactHandler(
  request: FastifyRequest<{ Body: ContactCore }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    if (!isValidPhoneNumber(`+${request.body.phone}`))
      return reply.code(400).send({ error: "Phone number is not valid" });

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
    const filterNewContacts = await getExistingContactCountByPhno(
      newContacts.map((item) => item.phone),
      orgId,
    );
    if (filterNewContacts === (newContacts?.length ?? 0))
      throw new Error("All contacts already exist");
    const res = await createMultipleContacts(newContacts, orgId);
    reply.code(201).send(res);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: error.message || "Something went wrong" });
  }
}

export async function getAllContactsHandler(
  request: FastifyRequest<{ Querystring: PaginationQuery }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const contacts = await getContactsByOrgId(orgId, request.query);
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

export async function importCSVContactsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const file = await request.file();
    const orgId = request.user.orgId;
    if (!dataExtractFileMimeTypes.includes(file?.mimetype))
      return reply
        .code(400)
        .send({ error: "This file type is not permitted." });
    let updateField = file?.fields?.update;
    const updateItem = (
      Array.isArray(updateField) ? updateField[0] : updateField
    ) as {
      value: string;
    };
    const updateExisting = updateItem?.value === "true";
    let tags = Object.values(file?.fields ?? {})
      .slice(2)
      .reduce((acc, data) => {
        const item = (Array.isArray(data) ? data[0] : data) as {
          value: string;
        };
        if (item?.value) {
          acc.push(item.value);
        }
        return acc;
      }, [] as string[]);

    const res: any = await importCSVContacts(file, orgId, tags, updateExisting);
    if (res.status === "error") {
      return reply.code(400).send({ error: "VALIDATION_ERR", data: res.data });
    }
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ error: e?.message || "Something went wrong" });
  }
}
