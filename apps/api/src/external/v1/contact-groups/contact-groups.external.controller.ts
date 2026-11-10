import { FastifyReply } from "fastify";
import {
  addExistingContactsToGroupHandler,
  addNewContactsToGroupHandler,
  createContactGroupHandler,
  deleteContactGroupHandler,
  getContactGroupsHandler,
  getContactsByContactGroupIdHandler,
  removeContactsFromGroupHandler,
  updateContactGroupHandler,
} from "../../../modules/contacts/audiences/audience.controller.js";
import { findForeignContactRef } from "../contacts/contactRefs.js";
import { ContactGroupNotFoundError } from "../../../modules/contacts/audiences/audience.errors.js";
import {
  getContactGroupById,
  getContactsByContactGroupIdWithPagination,
} from "../../../modules/contacts/audiences/audience.service.js";

export async function createContactGroupExternalController(
  request: Parameters<typeof createContactGroupHandler>[0],
  reply: FastifyReply,
) {
  return createContactGroupHandler(request, reply);
}

/**
 * v1 documents both group reads below as arrays. The dashboard handlers they used to forward
 * to answer `?contactGroupId=` with a single group and a group's members as
 * `{ group, totalCount }`, which the route's array schema refused — both always answered 500.
 * These keep v1's documented shape.
 */
export async function getContactGroupsExternalController(
  request: Parameters<typeof getContactGroupsHandler>[0],
  reply: FastifyReply,
) {
  const { contactGroupId } = request.query;
  if (!contactGroupId) return getContactGroupsHandler(request, reply);
  const group = await getContactGroupById(contactGroupId, request.user.orgId);
  if (!group) return reply.code(404).send({ error: "Contact group not found" });
  return reply.code(200).send([group]);
}

export async function getContactsByContactGroupIdExternalController(
  request: Parameters<typeof getContactsByContactGroupIdHandler>[0],
  reply: FastifyReply,
) {
  try {
    const { group } = await getContactsByContactGroupIdWithPagination(
      request.params.contactGroupId,
      request.user.orgId,
      request.query,
    );
    return reply.code(200).send(group);
  } catch (error) {
    if (error instanceof ContactGroupNotFoundError) {
      return reply.code(404).send({ error: "Contact group not found" });
    }
    throw error;
  }
}

export async function updateContactGroupExternalController(
  request: Parameters<typeof updateContactGroupHandler>[0],
  reply: FastifyReply,
) {
  return updateContactGroupHandler(request, reply);
}

export async function deleteContactGroupExternalController(
  request: Parameters<typeof deleteContactGroupHandler>[0],
  reply: FastifyReply,
) {
  return deleteContactGroupHandler(request, reply);
}

export async function addExistingContactsToGroupExternalController(
  request: Parameters<typeof addExistingContactsToGroupHandler>[0],
  reply: FastifyReply,
) {
  return addExistingContactsToGroupHandler(request, reply);
}

export async function addNewContactsToGroupExternalController(
  request: Parameters<typeof addNewContactsToGroupHandler>[0],
  reply: FastifyReply,
) {
  if (Array.isArray(request.body)) {
    const foreignRef = await findForeignContactRef(request.user.orgId, request.body);
    // The group handlers' error shape (`{ error }`), at the status of a bad body.
    if (foreignRef) return reply.code(400).send({ error: foreignRef });
    request.body.forEach((contact) => {
      contact.source = "external";
    });
  }
  return addNewContactsToGroupHandler(request, reply);
}

export async function removeContactsFromGroupExternalController(
  request: Parameters<typeof removeContactsFromGroupHandler>[0],
  reply: FastifyReply,
) {
  return removeContactsFromGroupHandler(request, reply);
}
