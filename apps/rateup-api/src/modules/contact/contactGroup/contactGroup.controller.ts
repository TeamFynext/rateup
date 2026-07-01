import { FastifyRequest, FastifyReply } from "fastify";
import { log } from "../../../utils/logger.js";
import {
  AddExistingContactsToGroupInput,
  AddExistingContactsToMultipleGroupsInput,
  AddNewContactsToGroupInput,
  ByContactGroupIdParams,
  contactGroupByContactId,
  ContactGroupByContactIdBody,
  CreateContactGroupInput,
  DeleteManyGroupsInput,
  GetContactGroupsQuery,
  RemoveGroupContactsSchema,
  UpdateContactGroupInput,
} from "./contactGroup.schema.js";
import {
  createContactGroup,
  getContactGroupById,
  addExistingContactsToGroup,
  addNewContactsToGroup,
  updateContactGroup,
  deleteContactGroup,
  getContactGroupsByTeamId,
  getContactGroupsByOrgId,
  removeContactsFromGroup,
  addExistingContactsToMultipleGroups,
  deleteManyContactGroups,
  getContactsByContactGroupIdWithPagination,
  getContactGroupsByContactId,
  updateContactGroupsForContact,
} from "./contactGroup.service.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import { dataExtractFileMimeTypes } from "../../fileUpload/fileUpload.schema.js";
import { createMultipleContacts, importCSVContacts } from "../contact.service.js";
import { PaginationQuery } from "../contact.schema.js";

export async function getContactGroupsHandler(
  request: FastifyRequest<{
    Querystring: GetContactGroupsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    if (request.query.contactGroupId) {
      const res = await getContactGroupById(request.query.contactGroupId);
      return reply.code(200).send(res);
    }

    if (request.query.teamId) {
      const res = await getContactGroupsByTeamId(request.query.teamId);
      return reply.code(200).send(res);
    }

    if (!request?.user?.orgId) {
      return reply.code(403).send({
        message: "Not authorized",
      });
    }

    const res = await getContactGroupsByOrgId(request.user.orgId, request.query.type);

    return reply.code(200).send(res);
  } catch (error) {
    log.error(error);

    return reply.code(500).send({
      error: "Something went wrong",
    });
  }
}

export async function getContactsByContactGroupIdHandler(
  request: FastifyRequest<{
    Params: ByContactGroupIdParams;
    Querystring: PaginationQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const contacts = await getContactsByContactGroupIdWithPagination(
      request.params.contactGroupId,
      request.query,
    );
    reply.code(200).send(contacts);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function createContactGroupHandler(
  request: FastifyRequest<{ Body: CreateContactGroupInput }>,
  reply: FastifyReply,
) {
  try {
    const contactGroup = await createContactGroup(request.body);
    reply.code(201).send(contactGroup);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.code(500).send({
          error: "Contact group with this name already exist in the provided team",
        });
      }
    }
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function addExistingContactsToGroupHandler(
  request: FastifyRequest<{
    Body: AddExistingContactsToGroupInput;
    Params: ByContactGroupIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const contactGroup = await addExistingContactsToGroup(
      request.params.contactGroupId,
      request.body.contactIds,
      request.body.isCustomer,
      request.user.orgId,
    );
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function addNewContactsToGroupHandler(
  request: FastifyRequest<{
    Body: AddNewContactsToGroupInput;
    Params: ByContactGroupIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    let contactGroup;
    await createMultipleContacts(request.body, orgId);
    contactGroup = await addNewContactsToGroup(request.params.contactGroupId, request.body, orgId);
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.code(400).send({ error: "Contact already exist" });
      }
    } else {
      reply.code(500).send({ error: "Something went wrong" });
    }
  }
}

export async function updateContactGroupHandler(
  request: FastifyRequest<{
    Body: UpdateContactGroupInput;
    Params: ByContactGroupIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const contactGroup = await updateContactGroup(request.params.contactGroupId, request.body);
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function deleteContactGroupHandler(
  request: FastifyRequest<{ Params: ByContactGroupIdParams }>,
  reply: FastifyReply,
) {
  try {
    const contactGroup = await deleteContactGroup(request.params.contactGroupId);
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function removeContactsFromGroupHandler(
  request: FastifyRequest<{
    Params: ByContactGroupIdParams;
    Body: RemoveGroupContactsSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const contacts = await removeContactsFromGroup(request.params.contactGroupId, request.body);
    reply.code(200).send(contacts);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: `Something went wrong: ${error}` });
  }
}

export async function addExistingContactsToMultipleGroupsHandler(
  request: FastifyRequest<{ Body: AddExistingContactsToMultipleGroupsInput }>,
  reply: FastifyReply,
) {
  try {
    const { contactIds, contactGroupIds } = request.body;
    const contactGroup = await addExistingContactsToMultipleGroups(
      contactIds,
      contactGroupIds,
      request.user.orgId,
    );
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function deleteManyContactGroupsHandler(
  request: FastifyRequest<{ Body: DeleteManyGroupsInput }>,
  reply: FastifyReply,
) {
  try {
    const { contactGroupIds } = request.body;
    const contactGroup = await deleteManyContactGroups(contactGroupIds);
    reply.code(200).send(contactGroup);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function addNewContactsfromCSVToGroupHandler(
  request: FastifyRequest<{ Params: ByContactGroupIdParams }>,
  reply: FastifyReply,
) {
  try {
    const file = await request.file();
    const { orgId } = request.user;
    const contactGroupId = request.params.contactGroupId;
    if (!dataExtractFileMimeTypes.includes(file?.mimetype))
      return reply.code(400).send({ error: "This file type is not permitted." });
    const tags = [];
    let update = false;
    for (const key in file?.fields) {
      if (key.startsWith("tags[")) {
        tags.push(file?.fields?.[key]?.["value"]);
      } else if (key === "update") {
        update = file?.fields?.[key]?.["value"] === "true";
      }
    }
    const res: any = await importCSVContacts(file, orgId, tags, update, contactGroupId);
    if (res.status === "error") {
      return reply.code(400).send({ error: "VALIDATION_ERR", data: res.data });
    }
    reply.code(200).send(res);
  } catch (err) {
    log.error(err);
    reply.code(500).send({ error: err?.message || "Something went wrong" });
  }
}

export async function getContactGroupsByContactIdHandler(
  request: FastifyRequest<{
    Params: contactGroupByContactId;
  }>,
  reply: FastifyReply,
) {
  try {
    const contactGroups = await getContactGroupsByContactId(
      request.params.contactId,
      request.user.orgId,
    );
    reply.code(200).send(contactGroups);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}

export async function updateContactGroupsForContactHandler(
  request: FastifyRequest<{
    Params: contactGroupByContactId;
    Body: ContactGroupByContactIdBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { addGroupIds = [], removeGroupIds = [] } = request.body || {};
    const res = await updateContactGroupsForContact(
      request.params.contactId,
      addGroupIds,
      removeGroupIds,
      request.user.orgId,
    );
    reply.code(200).send(res);
  } catch (error) {
    log.error(error);
    reply.code(500).send({ error: "Something went wrong" });
  }
}
