import { FastifyInstance } from "fastify";
import { $extContactSchema } from "../contact/contact.external.schema.js";
import { extAddNewContactsToGroupHandler } from "./contact-group.external.controller.js";
import { $contactGroupRef } from "../contact/internal-copy/contact/contactGroup/contactGroup.schema.js";
import {
  addExistingContactsToGroupHandler,
  createContactGroupHandler,
  deleteContactGroupHandler,
  getContactGroupsHandler,
  getContactsByContactGroupIdHandler,
  removeContactsFromGroupHandler,
  updateContactGroupHandler,
} from "../contact/internal-copy/contact/contactGroup/contactGroup.controller.js";

export async function extContactGroupRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $contactGroupRef("createContactGroupInputSchema"),
        description: "Create a contact group",
        summary: "Create a contact group",
        tags: ["Contacts/Groups"],
        response: {
          200: $contactGroupRef("contactGroupResponseSchema"),
        },
      },
    },
    createContactGroupHandler,
  );

  server.get(
    "/",
    {
      schema: {
        querystring: $contactGroupRef("getContactGroupsQuerySchema"),
        description: "Get all contact groups",
        summary: "Get all contact groups",
        tags: ["Contacts/Groups"],
        response: {
          200: {
            type: "array",
            items: $contactGroupRef("contactGroupResponseSchema"),
          },
        },
      },
    },
    getContactGroupsHandler,
  );

  server.get(
    "/:contactGroupId/contacts",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdWithOrgIdParamsSchema"),
        description: "Get contacts by contact group id",
        summary: "Get contacts by contact group id",
        tags: ["Contacts/Groups"],
        response: {
          200: {
            type: "array",
            items: $extContactSchema("contactResponseSchema"),
          },
        },
      },
    },
    getContactsByContactGroupIdHandler,
  );

  server.put(
    "/:contactGroupId",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdWithOrgIdParamsSchema"),
        body: $contactGroupRef("updateContactGroupInputSchema"),
        description: "Update a contact group",
        summary: "Update a contact group",
        tags: ["Contacts/Groups"],
      },
    },
    updateContactGroupHandler,
  );

  server.delete(
    "/:contactGroupId",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdWithOrgIdParamsSchema"),
        description: "Delete a contact group",
        summary: "Delete a contact group",
        tags: ["Contacts/Groups"],
      },
    },
    deleteContactGroupHandler,
  );
  server.post(
    "/:contactGroupId/contacts/existing",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdWithOrgIdParamsSchema"),
        body: $contactGroupRef("addExistingContactsToGroupInputSchema"),
        description: "Add existing contacts to a contact group",
        summary: "Add existing contacts to a contact group",
        tags: ["Contacts/Groups"],
      },
    },
    addExistingContactsToGroupHandler,
  );

  server.post(
    "/:contactGroupId/contacts/new",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdWithOrgIdParamsSchema"),
        body: $contactGroupRef("extAddNewContactsToGroupInputSchema"),
        description: "Add new contacts to a contact group",
        summary: "Add new contacts to a contact group",
        tags: ["Contacts/Groups"],
      },
    },
    extAddNewContactsToGroupHandler,
  );

  server.delete(
    "/:contactGroupId/contacts",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdWithOrgIdParamsSchema"),
        body: $contactGroupRef("removeGroupContactsSchema"),
        description: "Remove contacts from a contact group",
        summary: "Remove contacts from a contact group",
        tags: ["Contacts/Groups"],
      },
    },
    removeContactsFromGroupHandler,
  );
}
