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
} from "../../../modules/contacts/audiences/audience.schema.js";
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
        description: "Create an audience",
        summary: "Create an audience",
        tags: ["Audiences"],
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
        description: "Get all audiences",
        summary: "Get all audiences",
        tags: ["Audiences"],
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
        description: "Get an audience's contacts by audience id",
        summary: "Get an audience's contacts by audience id",
        tags: ["Audiences"],
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
        description: "Update an audience",
        summary: "Update an audience",
        tags: ["Audiences"],
      },
    },
    updateContactGroupExternalController,
  );

  server.delete(
    "/:contactGroupId",
    {
      schema: {
        params: byContactGroupIdWithOrgIdParamsSchema,
        description: "Delete an audience",
        summary: "Delete an audience",
        tags: ["Audiences"],
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
        description: "Add existing contacts to an audience",
        summary: "Add existing contacts to an audience",
        tags: ["Audiences"],
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
        description: "Add new contacts to an audience",
        summary: "Add new contacts to an audience",
        tags: ["Audiences"],
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
        description: "Remove contacts from an audience",
        summary: "Remove contacts from an audience",
        tags: ["Audiences"],
      },
    },
    removeContactsFromGroupExternalController,
  );
}
