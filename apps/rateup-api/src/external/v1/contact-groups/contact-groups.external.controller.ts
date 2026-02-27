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
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return createContactGroupHandler(request as any, reply);
}

export async function getContactGroupsExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getContactGroupsHandler(request as any, reply);
}

export async function getContactsByContactGroupIdExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getContactsByContactGroupIdHandler(request as any, reply);
}

export async function updateContactGroupExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return updateContactGroupHandler(request as any, reply);
}

export async function deleteContactGroupExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return deleteContactGroupHandler(request as any, reply);
}

export async function addExistingContactsToGroupExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return addExistingContactsToGroupHandler(request as any, reply);
}

export async function addNewContactsToGroupExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (Array.isArray(request.body)) {
    (request.body as any[]).forEach((contact) => {
      contact.source = "external";
    });
  }
  return addNewContactsToGroupHandler(request as any, reply);
}

export async function removeContactsFromGroupExternalController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return removeContactsFromGroupHandler(request as any, reply);
}
