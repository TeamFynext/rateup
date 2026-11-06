import type { FastifyInstance, FastifyRequest } from "fastify";

import { externalErrorResponses } from "../../shared/errors.js";
import { externalRateLimit } from "../../shared/rateLimit.js";
import { declareExternalScopes } from "../../shared/scopes.js";
import * as C from "./contacts.controller.js";
import * as I from "./identities.controller.js";
import * as S from "./contacts.schema.js";

/**
 * The partner contacts API.
 *
 * Every route returns the shared `contactSchema` (contacts.schema.ts), whose
 * serializer drops whatever a handler is handed beyond it — Contact carries the whole inbox
 * on it, and the version this replaced sent all of it.
 *
 * Idempotency-Key is honoured on every write but not required: a retried create answers
 * 409 contact_already_exists (with the contact's id), and a retried bulk create reports
 * the rows as skipped, so neither does harm without one.
 */
export async function externalContactRoutes(server: FastifyInstance) {
  const TAG = ["Contacts"];
  declareExternalScopes(server, { read: "contacts.read", write: "contacts.manage" });

  // A factory, called inline per route: a shared instance would pin every route's request
  // type to the bare FastifyRequest and lose the typed body.
  const writeLimit = <R extends FastifyRequest>() =>
    externalRateLimit<R>({ max: 300, windowSeconds: 60, key: "extContactsWrite" });

  server.get(
    "/",
    {
      schema: {
        tags: TAG,
        summary: "List contacts",
        description:
          "Newest first. Filter by `search` (name, email or phone), `labelId` or `contactGroupId`.",
        querystring: S.contactListQuerySchema,
        response: { 200: S.contactListSchema, ...externalErrorResponses },
      },
    },
    C.listContactsHandler,
  );

  server.get(
    "/lookup",
    {
      schema: {
        tags: TAG,
        summary: "Find a contact by any identity",
        description:
          "Exact match on one identity: `kind` and `value` (PHONE, EMAIL, WA_BSUID, IG_SCOPED, " +
          "FB_PSID, WEBCHAT, EXTERNAL), or `phone` alone as before — digits with the country " +
          "code, no `+`, e.g. 919876543210. Finds a merged contact by any of its phones, emails " +
          "or ids. `channelId` narrows IG_SCOPED, FB_PSID and WEBCHAT to one channel; " +
          "`integration` narrows EXTERNAL to one system.",
        querystring: S.contactLookupQuerySchema,
        response: { 200: S.contactDetailSchema, ...externalErrorResponses },
      },
    },
    I.lookupContactHandler,
  );

  server.post(
    "/",
    {
      schema: {
        tags: TAG,
        summary: "Create a contact",
        description:
          "Runs the org's contact-created automations. 409 `contact_already_exists` when the " +
          "phone or externalId is taken, with the existing contact's id in `details`.",
        body: S.createContactBodySchema,
        response: { 201: S.contactSchema, ...externalErrorResponses },
      },
      preHandler: [writeLimit()],
    },
    C.createContactHandler,
  );

  server.post(
    "/bulk",
    {
      schema: {
        tags: TAG,
        summary: "Create contacts in bulk",
        description:
          `Up to ${S.MAX_BULK_CONTACTS} contacts. Creates the new ones and reports the rest in ` +
          "`skipped`: an existing phone/externalId is `already_exists`, a repeat within the " +
          "request is `duplicate_in_request`. Always 200, even when nothing was created. " +
          "No automations run for bulk-created contacts.",
        body: S.bulkCreateContactsBodySchema,
        response: { 200: S.bulkCreateContactsResultSchema, ...externalErrorResponses },
      },
      preHandler: [
        writeLimit(),
        externalRateLimit({
          max: 30,
          windowSeconds: 60,
          key: "extContactsBulk",
          failClosed: true,
        }),
      ],
    },
    C.bulkCreateContactsHandler,
  );

  server.get(
    "/:contactId",
    {
      schema: {
        tags: TAG,
        summary: "Get a contact",
        description: "With its identities: every phone, email and platform id it is known by.",
        params: S.contactIdParamsSchema,
        response: { 200: S.contactDetailSchema, ...externalErrorResponses },
      },
    },
    C.getContactHandler,
  );

  server.patch(
    "/:contactId",
    {
      schema: {
        tags: TAG,
        summary: "Update a contact",
        description:
          "Partial: only the fields sent change. `customFields` merge (null removes one); " +
          "`labels` replace the contact's labels.",
        params: S.contactIdParamsSchema,
        body: S.updateContactBodySchema,
        response: { 200: S.contactSchema, ...externalErrorResponses },
      },
      preHandler: [writeLimit()],
    },
    C.updateContactHandler,
  );

  server.delete(
    "/:contactId",
    {
      schema: {
        tags: TAG,
        summary: "Delete a contact",
        description: "Permanently deletes the contact and its conversation history.",
        params: S.contactIdParamsSchema,
        response: { 200: S.contactDeletedSchema, ...externalErrorResponses },
      },
      preHandler: [writeLimit()],
    },
    C.deleteContactHandler,
  );

  server.get(
    "/:contactId/identities",
    {
      schema: {
        tags: TAG,
        summary: "List a contact's identities",
        params: S.contactIdParamsSchema,
        response: { 200: S.contactIdentityListSchema, ...externalErrorResponses },
      },
    },
    I.listContactIdentitiesHandler,
  );

  server.post(
    "/:contactId/identities",
    {
      schema: {
        tags: TAG,
        summary: "Add an identity to a contact",
        description:
          "A PHONE, EMAIL or EXTERNAL id (with `integration`). 201 when added, 200 when the " +
          "contact already had it. 409 `identity_in_use` when another contact holds it, with " +
          "that contact's id in `details.contactId` — merge the two to join them. A contact's " +
          "first identity of a kind becomes its `phone` or `email`.",
        params: S.contactIdParamsSchema,
        body: S.addContactIdentityBodySchema,
        response: {
          200: S.contactIdentitySchema,
          201: S.contactIdentitySchema,
          ...externalErrorResponses,
        },
      },
      preHandler: [writeLimit()],
    },
    I.addContactIdentityHandler,
  );

  server.delete(
    "/:contactId/identities/:identityId",
    {
      schema: {
        tags: TAG,
        summary: "Remove an identity from a contact",
        description:
          "409 `last_identity` for the contact's only one. Removing the primary phone or email " +
          "promotes the next one, or clears the field.",
        params: S.contactIdentityParamsSchema,
        response: { 200: S.contactDeletedSchema, ...externalErrorResponses },
      },
      preHandler: [writeLimit()],
    },
    I.removeContactIdentityHandler,
  );

  server.post(
    "/:contactId/merge",
    {
      // Its own scope: a merge deletes the source contact (apiKeyFeatures.ts, contacts_merge).
      config: { permission: "contacts.merge" },
      schema: {
        tags: TAG,
        summary: "Merge another contact into this one",
        description:
          "`sourceContactId` is merged into the contact in the path, which is kept: its " +
          "identities, conversations, orders, labels, audiences and loyalty move over, and the " +
          "source is deleted. Fires the `contact.merged` webhook. Cannot be undone.",
        params: S.contactIdParamsSchema,
        body: S.mergeContactBodySchema,
        response: { 200: S.contactDetailSchema, ...externalErrorResponses },
      },
      preHandler: [
        writeLimit(),
        externalRateLimit({
          max: 30,
          windowSeconds: 60,
          key: "extContactsMerge",
          failClosed: true,
        }),
      ],
    },
    I.mergeContactHandler,
  );
}
