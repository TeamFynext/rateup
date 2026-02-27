import { FastifyInstance } from "fastify";
import {
  $contactGroupRef,
  contactGroupSchemas,
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
import {
  $extContactSchema,
  extContactSchemas,
} from "./contact.external.schema.js";

export async function externalContactGroupRoutes(server: FastifyInstance) {
  for (const schema of contactGroupSchemas) {
    server.addSchema(schema);
  }
  for (const schema of extContactSchemas) {
    server.addSchema(schema);
  }

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
    createContactGroupExternalController,
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
    getContactGroupsExternalController,
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
    getContactsByContactGroupIdExternalController,
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
    updateContactGroupExternalController,
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
    deleteContactGroupExternalController,
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
    addExistingContactsToGroupExternalController,
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
    addNewContactsToGroupExternalController,
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
    removeContactsFromGroupExternalController,
  );
}
