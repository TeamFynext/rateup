import { FastifyInstance } from "fastify";
import { $contactGroupRef } from "./contactGroup.schema.js";
import {
  createContactGroupHandler,
  getContactGroupsHandler,
  updateContactGroupHandler,
  deleteContactGroupHandler,
  addExistingContactsToGroupHandler,
  addNewContactsToGroupHandler,
  getContactsByContactGroupIdHandler,
  removeContactsFromGroupHandler,
  addExistingContactsToMultipleGroupsHandler,
  deleteManyContactGroupsHandler,
} from "./contactGroup.controller.js";

export async function contactGroupRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        body: $contactGroupRef("createContactGroupInputSchema"),
      },
    },
    createContactGroupHandler,
  );

  server.get(
    "/",
    {
      schema: {
        querystring: $contactGroupRef("getContactGroupsQuerySchema"),
      },
    },
    getContactGroupsHandler,
  );

  server.get(
    "/:contactGroupId/contacts",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdParamsSchema"),
      },
    },
    getContactsByContactGroupIdHandler,
  );

  server.put(
    "/:contactGroupId",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdParamsSchema"),
        body: $contactGroupRef("updateContactGroupInputSchema"),
      },
    },
    updateContactGroupHandler,
  );

  server.delete(
    "/:contactGroupId",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdParamsSchema"),
      },
    },
    deleteContactGroupHandler,
  );

  server.post(
    "/:contactGroupId/contacts/existing",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdParamsSchema"),
        body: $contactGroupRef("addExistingContactsToGroupInputSchema"),
      },
    },
    addExistingContactsToGroupHandler,
  );

  server.post(
    "/:contactGroupId/contacts/new",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdParamsSchema"),
        body: $contactGroupRef("addNewContactsToGroupInputSchema"),
      },
    },
    addNewContactsToGroupHandler,
  );

  server.put(
    "/:contactGroupId/contacts",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdParamsSchema"),
        body: $contactGroupRef("removeGroupContactsSchema"),
      },
    },
    removeContactsFromGroupHandler,
  );

  server.post(
    "/contacts/existing",
    {
      schema: {
        body: $contactGroupRef(
          "addExistingContactsToMultipleGroupsInputSchema",
        ),
      },
    },
    addExistingContactsToMultipleGroupsHandler,
  );

  server.delete(
    "/",
    {
      schema: {
        body: $contactGroupRef("deleteManyGroupSchema"),
      },
    },
    deleteManyContactGroupsHandler,
  );
}
