import type { FastifyInstance, FastifyRequest } from "fastify";

import { externalErrorResponses } from "../../shared/errors.js";
import { paginationQuerySchema } from "../pagination.js";
import { externalRateLimit } from "../../shared/rateLimit.js";
import { declareExternalScopes } from "../../shared/scopes.js";
import * as C from "./contactGroups.controller.js";
import * as S from "./contactGroups.schema.js";

export async function externalContactGroupRoutes(server: FastifyInstance) {
  const TAG = ["Contacts/Groups"];
  declareExternalScopes(server, { read: "contacts.read", write: "contacts.manage" });

  // Every write in the module shares one bucket; import is held tighter on top of it, since
  // one call can create a thousand contacts and fire as many integration events.
  // Factories rather than shared instances so each route infers its own request type; the
  // bucket lives in Redis under `key`, so every write route still shares one.
  const writeLimit = <R extends FastifyRequest>() =>
    externalRateLimit<R>({ max: 300, windowSeconds: 60, key: "extContactGroupWrite" });
  const importLimit = <R extends FastifyRequest>() =>
    externalRateLimit<R>({
      max: 30,
      windowSeconds: 60,
      key: "extContactGroupImport",
      failClosed: true,
    });
  const params = S.contactGroupIdParamsSchema;

  // ---- groups ----------------------------------------------------------------

  server.get(
    "/",
    {
      schema: {
        tags: TAG,
        summary: "List contact groups",
        description: "Newest first. Filter by team, type, or a case-insensitive name match.",
        querystring: S.contactGroupListQuerySchema,
        response: { 200: S.contactGroupListSchema, ...externalErrorResponses },
      },
    },
    C.listContactGroupsHandler,
  );

  server.post(
    "/",
    {
      schema: {
        tags: TAG,
        summary: "Create a contact group",
        description:
          "Group names are unique within a team; a clash answers `409 contact_group_already_exists`.",
        body: S.createContactGroupSchema,
        response: { 201: S.contactGroupDetailSchema, ...externalErrorResponses },
      },
      preHandler: writeLimit(),
    },
    C.createContactGroupHandler,
  );

  server.get(
    "/:contactGroupId",
    {
      schema: {
        tags: TAG,
        summary: "Get a contact group",
        description: "The group with its member count.",
        params,
        response: { 200: S.contactGroupDetailSchema, ...externalErrorResponses },
      },
    },
    C.getContactGroupHandler,
  );

  server.patch(
    "/:contactGroupId",
    {
      schema: {
        tags: TAG,
        summary: "Update a contact group",
        description: "Send only the fields to change; `null` clears `icon` or `tags`.",
        params,
        body: S.updateContactGroupSchema,
        response: { 200: S.contactGroupDetailSchema, ...externalErrorResponses },
      },
      preHandler: writeLimit(),
    },
    C.updateContactGroupHandler,
  );

  server.delete(
    "/:contactGroupId",
    {
      schema: {
        tags: TAG,
        summary: "Delete a contact group",
        description: "Deletes the group and its memberships. The contacts themselves remain.",
        params,
        response: { 204: S.emptySchema, ...externalErrorResponses },
      },
      preHandler: writeLimit(),
    },
    C.deleteContactGroupHandler,
  );

  // ---- members ---------------------------------------------------------------

  server.get(
    "/:contactGroupId/contacts",
    {
      schema: {
        tags: TAG,
        summary: "List a group's contacts",
        description: "Ordered by the contact's creation time, newest first.",
        params,
        querystring: paginationQuerySchema,
        response: { 200: S.groupContactListSchema, ...externalErrorResponses },
      },
    },
    C.listGroupContactsHandler,
  );

  server.post(
    "/:contactGroupId/contacts",
    {
      schema: {
        tags: TAG,
        summary: "Add existing contacts to a group",
        description:
          "Up to 1000 contact ids. Ids already in the group are counted, not refused; ids " +
          "that are not this org's contacts come back in `notFound`.",
        params,
        body: S.contactIdsBodySchema,
        response: { 200: S.addContactsResultSchema, ...externalErrorResponses },
      },
      preHandler: writeLimit(),
    },
    C.addGroupContactsHandler,
  );

  server.post(
    "/:contactGroupId/contacts/remove",
    {
      schema: {
        tags: TAG,
        summary: "Remove contacts from a group",
        description:
          "Up to 1000 contact ids. Ids that are not members are ignored. The contacts " +
          "themselves are not deleted.",
        params,
        body: S.contactIdsBodySchema,
        response: { 200: S.removeContactsResultSchema, ...externalErrorResponses },
      },
      preHandler: writeLimit(),
    },
    C.removeGroupContactsHandler,
  );

  server.post(
    "/:contactGroupId/contacts/import",
    {
      schema: {
        tags: TAG,
        summary: "Import contacts into a group",
        description:
          "Up to 1000 contacts, matched by phone: an unknown phone creates a contact " +
          "(source `external`), a known one is reused unchanged. Every resolved contact is " +
          "added to the group.",
        params,
        body: S.importContactsBodySchema,
        response: { 200: S.importContactsResultSchema, ...externalErrorResponses },
      },
      preHandler: [writeLimit(), importLimit()],
    },
    C.importGroupContactsHandler,
  );
}
