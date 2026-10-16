import z from "zod";
import { FastifyInstance } from "fastify";
import {
  createContactGroupInputSchema,
  contactGroupResponseSchema,
  getContactGroupsQuerySchema,
  byContactGroupIdWithOrgIdParamsSchema,
  updateContactGroupInputSchema,
  addExistingContactsToGroupInputSchema,
  extAddNewContactsToGroupInputSchema,
  removeGroupContactsSchema,
} from "../../../modules/contact/contactGroup/contactGroup.schema.js";
import {
  addExistingContactsToGroupExternalController,
  addNewContactsToGroupExternalController,
  createContactGroupExternalController,
  deleteContactGroupExternalController,
  getContactGroupsExternalController,
  getContactsByContactGroupIdExternalController,
  removeContactsFromGroupExternalController,
  updateContactGroupExternalController,
} from "./contact-groups.external.controller.js";
import { contactResponseSchema } from "./contact.external.schema.js";

/**
 * The shared group schema is the dashboard's input shape, and does not describe a stored row:
 * `icon` is nullable in the table and `createdAt` comes back from Prisma as a Date. The
 * serializer refused both, so any org with an icon-less group got a 500 from every list and
 * create here. Widening only those two keeps v1's wire output otherwise unchanged (a Date is
 * sent as its ISO string).
 */
const groupResponseSchema = contactGroupResponseSchema.extend({
  icon: z.string().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
});
import { declareExternalScopes } from "../../shared/scopes.js";

export async function externalContactGroupRoutes(server: FastifyInstance) {
  declareExternalScopes(server, { read: "contacts.read", write: "contacts.manage" });

  server.post(
    "/",
    {
      schema: {
        body: createContactGroupInputSchema,
        description: "Create a contact group",
        summary: "Create a contact group",
        tags: ["Contacts/Groups"],
        response: {
          200: groupResponseSchema,
        },
      },
    },
    createContactGroupExternalController,
  );

  server.get(
    "/",
    {
      schema: {
        querystring: getContactGroupsQuerySchema,
        description: "Get all contact groups",
        summary: "Get all contact groups",
        tags: ["Contacts/Groups"],
        response: {
          200: groupResponseSchema.array(),
        },
      },
    },
    getContactGroupsExternalController,
  );

  server.get(
    "/:contactGroupId/contacts",
    {
      schema: {
        params: byContactGroupIdWithOrgIdParamsSchema,
        description: "Get contacts by contact group id",
        summary: "Get contacts by contact group id",
        tags: ["Contacts/Groups"],
        response: {
          200: contactResponseSchema.array(),
        },
      },
    },
    getContactsByContactGroupIdExternalController,
  );

  server.put(
    "/:contactGroupId",
    {
      schema: {
        params: byContactGroupIdWithOrgIdParamsSchema,
        body: updateContactGroupInputSchema,
        description: "Update a contact group",
        summary: "Update a contact group",
        tags: ["Contacts/Groups"],
      },
    },
    updateContactGroupExternalController,
  );

  server.delete(
    "/:contactGroupId",
    {
      schema: {
        params: byContactGroupIdWithOrgIdParamsSchema,
        description: "Delete a contact group",
        summary: "Delete a contact group",
        tags: ["Contacts/Groups"],
      },
    },
    deleteContactGroupExternalController,
  );

  server.post(
    "/:contactGroupId/contacts/existing",
    {
      schema: {
        params: byContactGroupIdWithOrgIdParamsSchema,
        body: addExistingContactsToGroupInputSchema,
        description: "Add existing contacts to a contact group",
        summary: "Add existing contacts to a contact group",
        tags: ["Contacts/Groups"],
      },
    },
    addExistingContactsToGroupExternalController,
  );

  server.post(
    "/:contactGroupId/contacts/new",
    {
      schema: {
        params: byContactGroupIdWithOrgIdParamsSchema,
        body: extAddNewContactsToGroupInputSchema,
        description: "Add new contacts to a contact group",
        summary: "Add new contacts to a contact group",
        tags: ["Contacts/Groups"],
      },
    },
    addNewContactsToGroupExternalController,
  );

  server.delete(
    "/:contactGroupId/contacts",
    {
      schema: {
        params: byContactGroupIdWithOrgIdParamsSchema,
        body: removeGroupContactsSchema,
        description: "Remove contacts from a contact group",
        summary: "Remove contacts from a contact group",
        tags: ["Contacts/Groups"],
      },
    },
    removeContactsFromGroupExternalController,
  );
}
