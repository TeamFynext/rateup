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
  addNewContactsfromCSVToGroupHandler,
} from "./contactGroup.controller.js";
import fastifyMultipart from "@fastify/multipart";

export async function contactGroupRoutes(server: FastifyInstance) {
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
    },
    throwFileSizeLimit: true,
  });
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
        querystring: $contactGroupRef("paginationQuery"),
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

  server.post(
    "/:contactGroupId/contacts/new/importcsv",
    {
      schema: {
        params: $contactGroupRef("byContactGroupIdParamsSchema"),
        consumes: ["multipart/form-data"],
      },
    },
    addNewContactsfromCSVToGroupHandler,
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
