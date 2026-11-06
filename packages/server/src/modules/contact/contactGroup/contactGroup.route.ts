import { FastifyInstance } from "fastify";
import {
  createContactGroupInputSchema,
  getContactGroupsQuerySchema,
  byContactGroupIdParamsSchema,
  paginationQuery,
  updateContactGroupInputSchema,
  addExistingContactsToGroupBodySchema,
  groupMatchCountsQuerySchema,
  addNewContactsToGroupInputSchema,
  removeGroupContactsSchema,
  deleteManyGroupSchema,
  contactGroupByContactId,
  contactGroupByContactIdBody,
  addExistingContactsToMultipleGroupsInputSchema,
} from "./contactGroup.schema.js";
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
  getContactGroupsByContactIdHandler,
  getGroupMatchCountsHandler,
  updateContactGroupsForContactHandler,
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
        body: createContactGroupInputSchema,
      },
    },
    createContactGroupHandler,
  );

  server.get(
    "/",
    {
      schema: {
        querystring: getContactGroupsQuerySchema,
      },
    },
    getContactGroupsHandler,
  );

  server.get(
    "/match-counts",
    {
      schema: {
        querystring: groupMatchCountsQuerySchema,
      },
    },
    getGroupMatchCountsHandler,
  );

  server.get(
    "/:contactGroupId/contacts",
    {
      schema: {
        params: byContactGroupIdParamsSchema,
        querystring: paginationQuery,
      },
    },
    getContactsByContactGroupIdHandler,
  );

  server.put(
    "/:contactGroupId",
    {
      schema: {
        params: byContactGroupIdParamsSchema,
        body: updateContactGroupInputSchema,
      },
    },
    updateContactGroupHandler,
  );

  server.delete(
    "/:contactGroupId",
    {
      schema: {
        params: byContactGroupIdParamsSchema,
      },
    },
    deleteContactGroupHandler,
  );

  server.post(
    "/:contactGroupId/contacts/existing",
    {
      schema: {
        params: byContactGroupIdParamsSchema,
        body: addExistingContactsToGroupBodySchema,
      },
    },
    addExistingContactsToGroupHandler,
  );

  server.post(
    "/:contactGroupId/contacts/new",
    {
      schema: {
        params: byContactGroupIdParamsSchema,
        body: addNewContactsToGroupInputSchema,
      },
    },
    addNewContactsToGroupHandler,
  );

  server.post(
    "/:contactGroupId/contacts/new/importcsv",
    {
      schema: {
        params: byContactGroupIdParamsSchema,
        consumes: ["multipart/form-data"],
      },
    },
    addNewContactsfromCSVToGroupHandler,
  );

  server.put(
    "/:contactGroupId/contacts",
    {
      schema: {
        params: byContactGroupIdParamsSchema,
        body: removeGroupContactsSchema,
      },
    },
    removeContactsFromGroupHandler,
  );

  server.post(
    "/contacts/existing",
    {
      schema: {
        body: addExistingContactsToMultipleGroupsInputSchema,
      },
    },
    addExistingContactsToMultipleGroupsHandler,
  );

  server.delete(
    "/",
    {
      schema: {
        body: deleteManyGroupSchema,
      },
    },
    deleteManyContactGroupsHandler,
  );

  server.get(
    "/contact/:contactId",
    {
      schema: {
        params: contactGroupByContactId,
      },
    },
    getContactGroupsByContactIdHandler,
  );

  server.post(
    "/contact/:contactId/groups",
    {
      schema: {
        params: contactGroupByContactId,
        body: contactGroupByContactIdBody,
      },
    },
    updateContactGroupsForContactHandler,
  );
}
