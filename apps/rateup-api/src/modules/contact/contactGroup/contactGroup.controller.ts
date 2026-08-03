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
import { ContactGroupNotFoundError } from "./contactGroup.errors.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import { dataExtractFileMimeTypes } from "../../fileUpload/fileUpload.schema.js";
import { createMultipleContacts, importCSVContacts } from "../contact.service.js";
import { getMultipartFieldValue } from "../../../utils/upload/validate.js";
import { PaginationQuery } from "../contact.schema.js";

function replyForError(reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof ContactGroupNotFoundError) {
    return reply.code(404).send({ error: error.message });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return reply.code(404).send({ error: "Contact group not found" });
  }
  log.error({ err: error }, context);
  return reply.code(500).send({ error: "Something went wrong" });
}

export async function getContactGroupsHandler(
  request: FastifyRequest<{
    Querystring: GetContactGroupsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    if (!request?.user?.orgId) {
      return reply.code(403).send({
        message: "Not authorized",
      });
    }
    const { orgId } = request.user;

    if (request.query.contactGroupId) {
      const res = await getContactGroupById(request.query.contactGroupId, orgId);
      if (!res) return reply.code(404).send({ error: "Contact group not found" });
      return reply.code(200).send(res);
    }

    if (request.query.teamId) {
      const res = await getContactGroupsByTeamId(request.query.teamId, orgId);
      return reply.code(200).send(res);
    }

    const res = await getContactGroupsByOrgId(orgId, request.query.type);

    return reply.code(200).send(res);
  } catch (error) {
    return replyForError(reply, error, "Error listing contact groups");
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
      request.user.orgId,
      request.query,
    );
    reply.code(200).send(contacts);
  } catch (error) {
    return replyForError(reply, error, "Error listing a group's contacts");
  }
}

export async function createContactGroupHandler(
  request: FastifyRequest<{ Body: CreateContactGroupInput }>,
  reply: FastifyReply,
) {
  try {
    const contactGroup = await createContactGroup(request.body, request.user.orgId);
    reply.code(201).send(contactGroup);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply.code(409).send({
        error: "Contact group with this name already exist in the provided team",
      });
    }
    return replyForError(reply, error, "Error creating a contact group");
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
    return replyForError(reply, error, "Error adding existing contacts to a group");
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      reply.code(400).send({ error: "Contact already exist" });
    } else {
      return replyForError(reply, error, "Error adding new contacts to a group");
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
    const contactGroup = await updateContactGroup(
      request.params.contactGroupId,
      request.user.orgId,
      request.body,
    );
    reply.code(200).send(contactGroup);
  } catch (error) {
    return replyForError(reply, error, "Error updating a contact group");
  }
}

export async function deleteContactGroupHandler(
  request: FastifyRequest<{ Params: ByContactGroupIdParams }>,
  reply: FastifyReply,
) {
  try {
    const contactGroup = await deleteContactGroup(
      request.params.contactGroupId,
      request.user.orgId,
    );
    reply.code(200).send(contactGroup);
  } catch (error) {
    return replyForError(reply, error, "Error deleting a contact group");
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
    const contacts = await removeContactsFromGroup(
      request.params.contactGroupId,
      request.user.orgId,
      request.body,
    );
    reply.code(200).send(contacts);
  } catch (error) {
    return replyForError(reply, error, "Error removing contacts from a group");
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
    const contactGroup = await deleteManyContactGroups(contactGroupIds, request.user.orgId);
    reply.code(200).send(contactGroup);
  } catch (error) {
    return replyForError(reply, error, "Error deleting contact groups");
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
    if (!dataExtractFileMimeTypes.includes(file?.mimetype as string))
      return reply.code(400).send({ error: "This file type is not permitted." });
    const tags: string[] = [];
    let update = false;
    let hasHeaderRow = true;
    for (const key in file?.fields) {
      const value = getMultipartFieldValue(file?.fields?.[key]);
      if (key.startsWith("tags[")) {
        if (typeof value === "string") tags.push(value);
      } else if (key === "update") {
        update = value === "true";
      } else if (key === "hasHeaderRow") {
        hasHeaderRow = value !== "false";
      }
    }
    const res = await importCSVContacts(file!, orgId, tags, update, contactGroupId, hasHeaderRow);
    if (res!.status === "error") {
      return reply.code(400).send({ error: "VALIDATION_ERR", data: res!.data });
    }
    reply.code(200).send(res);
  } catch (err) {
    log.error({ err }, "Error importing CSV contacts to group");
    reply
      .code(500)
      .send({ error: (err instanceof Error && err.message) || "Something went wrong" });
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
