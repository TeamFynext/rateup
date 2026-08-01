import { FastifyReply, FastifyRequest } from "fastify";
import {
  addExistingContactsToGroupHandler,
  addNewContactsToGroupHandler,
  createContactGroupHandler,
  deleteContactGroupHandler,
  getContactGroupsHandler,
  getContactsByContactGroupIdHandler,
  removeContactsFromGroupHandler,
  updateContactGroupHandler,
} from "../../../modules/contact/contactGroup/contactGroup.controller.js";

export async function createContactGroupExternalController(
  request: Parameters<typeof createContactGroupHandler>[0],
  reply: FastifyReply,
) {
  return createContactGroupHandler(request, reply);
}

export async function getContactGroupsExternalController(
  request: Parameters<typeof getContactGroupsHandler>[0],
  reply: FastifyReply,
) {
  return getContactGroupsHandler(request, reply);
}

export async function getContactsByContactGroupIdExternalController(
  request: Parameters<typeof getContactsByContactGroupIdHandler>[0],
  reply: FastifyReply,
) {
  return getContactsByContactGroupIdHandler(request, reply);
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
