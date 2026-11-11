import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { HttpError } from "../../../utils/http.js";
import {
  addManualIdentity,
  listContactIdentities,
  removeIdentity,
  updateManualIdentity,
} from "../identity/identity.service.js";
import { listMergesForContact, mergeContacts, previewMerge } from "./merge.service.js";
import {
  countPendingSuggestions,
  dismissSuggestion,
  listMergeSuggestions,
  scanForDuplicates,
  suggestionsForContact,
} from "./suggestions.service.js";
import prisma from "../../../utils/prisma.js";
import { whatsappReachForContact } from "../identity/reach.js";
import {
  addIdentityBodySchema,
  contactIdParamSchema,
  idParamSchema,
  identityParamSchema,
  mergeBodySchema,
  mergePreviewQuerySchema,
  suggestionListQuerySchema,
  updateIdentityBodySchema,
  type AddIdentityBody,
  type MergeBody,
  type MergePreviewQuery,
  type SuggestionListQuery,
  type UpdateIdentityBody,
} from "./merge.schema.js";

const orgOf = (request: FastifyRequest) => request.actor!.orgId;
const userOf = (request: FastifyRequest) => request.actor?.userId ?? null;

/**
 * Contact merge and identities, under `/api/contacts/merge` and `/api/contacts/identities`.
 * Merging needs `contacts.merge` (owners and admins by default, grantable); reading
 * suggestions and identities needs `contacts.read`; adding a phone or email by hand is an
 * ordinary contact edit (`contacts.manage`).
 */
export async function contactMergeRoutes(server: FastifyInstance) {
  server.get(
    "/preview",
    { config: { permission: "contacts.merge" }, schema: { querystring: mergePreviewQuerySchema } },
    async (request: FastifyRequest<{ Querystring: MergePreviewQuery }>, reply: FastifyReply) =>
      reply.send(
        await previewMerge(orgOf(request), request.query.sourceId, request.query.targetId),
      ),
  );

  server.post(
    "/",
    { config: { permission: "contacts.merge" }, schema: { body: mergeBodySchema } },
    async (request: FastifyRequest<{ Body: MergeBody }>, reply: FastifyReply) => {
      const { sourceId, targetId, fieldChoices, suggestionId } = request.body;
      const result = await mergeContacts(
        orgOf(request),
        sourceId,
        targetId,
        { userId: userOf(request), reason: suggestionId ? "SUGGESTION" : "MANUAL" },
        fieldChoices ?? {},
      );
      return reply.send({ contact: result.target, mergeId: result.mergeId });
    },
  );

  server.get(
    "/suggestions",
    { config: { permission: "contacts.read" }, schema: { querystring: suggestionListQuerySchema } },
    async (request: FastifyRequest<{ Querystring: SuggestionListQuery }>, reply: FastifyReply) =>
      reply.send(await listMergeSuggestions(orgOf(request), request.query)),
  );

  server.get(
    "/suggestions/count",
    { config: { permission: "contacts.read" } },
    async (request: FastifyRequest, reply: FastifyReply) =>
      reply.send({ pending: await countPendingSuggestions(orgOf(request)) }),
  );

  /** Looks through the org's existing contacts for duplicates; raises suggestions only. */
  server.post(
    "/suggestions/scan",
    { config: { permission: "contacts.merge" } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { pairs } = await scanForDuplicates(orgOf(request));
      return reply.send({ pairs, pending: await countPendingSuggestions(orgOf(request)) });
    },
  );

  server.post(
    "/suggestions/:id/dismiss",
    { config: { permission: "contacts.merge" }, schema: { params: idParamSchema } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const ok = await dismissSuggestion(orgOf(request), request.params.id, userOf(request));
      if (!ok) throw new HttpError("Suggestion not found or already resolved", 404);
      return reply.send({ ok: true });
    },
  );

  /** Everything the contact panel shows about identity: identities, duplicates, merge history. */
  server.get(
    "/contact/:contactId",
    { config: { permission: "contacts.read" }, schema: { params: contactIdParamSchema } },
    async (request: FastifyRequest<{ Params: { contactId: string } }>, reply: FastifyReply) => {
      const orgId = orgOf(request);
      const { contactId } = request.params;
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, orgId },
        select: { id: true },
      });
      if (!contact) throw new HttpError("Contact not found", 404);
      const [identities, suggestions, merges] = await Promise.all([
        listContactIdentities(orgId, contactId),
        suggestionsForContact(orgId, contactId),
        listMergesForContact(orgId, contactId),
      ]);
      return reply.send({
        identities,
        // Kept for older clients; every identity is in `identities` now.
        legacyIdentities: [],
        suggestions,
        merges,
      });
    },
  );
}

export async function contactIdentityRoutes(server: FastifyInstance) {
  /** Which WhatsApp numbers can message this contact, and the address each would use. */
  server.get(
    "/:contactId/whatsapp-reach",
    { config: { permission: "inbox.read" }, schema: { params: contactIdParamSchema } },
    async (request: FastifyRequest<{ Params: { contactId: string } }>, reply: FastifyReply) => {
      const reach = await whatsappReachForContact(orgOf(request), request.params.contactId);
      if (!reach) throw new HttpError("Contact not found", 404);
      return reply.send(reach);
    },
  );

  server.get(
    "/:contactId",
    { config: { permission: "contacts.read" }, schema: { params: contactIdParamSchema } },
    async (request: FastifyRequest<{ Params: { contactId: string } }>, reply: FastifyReply) =>
      reply.send(await listContactIdentities(orgOf(request), request.params.contactId)),
  );

  server.post(
    "/:contactId",
    {
      config: { permission: "contacts.manage" },
      schema: { params: contactIdParamSchema, body: addIdentityBodySchema },
    },
    async (
      request: FastifyRequest<{ Params: { contactId: string }; Body: AddIdentityBody }>,
      reply: FastifyReply,
    ) => {
      const result = await addManualIdentity(
        orgOf(request),
        request.params.contactId,
        request.body,
      );
      switch (result.status) {
        case "not_found":
          throw new HttpError("Contact not found", 404);
        case "invalid":
          throw new HttpError("That doesn't look like a valid phone number or email", 400);
        case "owned_by_other":
          return reply.code(409).send({
            message: "Another contact already has this. Merge them instead.",
            ownerContactId: result.ownerContactId,
          });
        default:
          return reply.code(201).send({ identityId: result.identityId });
      }
    },
  );

  server.patch(
    "/:contactId/:identityId",
    {
      config: { permission: "contacts.manage" },
      schema: { params: identityParamSchema, body: updateIdentityBodySchema },
    },
    async (
      request: FastifyRequest<{
        Params: { contactId: string; identityId: string };
        Body: UpdateIdentityBody;
      }>,
      reply: FastifyReply,
    ) => {
      const { contactId, identityId } = request.params;
      const result = await updateManualIdentity(
        orgOf(request),
        contactId,
        identityId,
        request.body,
      );
      switch (result.status) {
        case "not_found":
          throw new HttpError("Identity not found", 404);
        case "not_editable":
          throw new HttpError("Only phone numbers and emails can be edited", 400);
        case "invalid":
          throw new HttpError("That doesn't look like a valid phone number or email", 400);
        case "duplicate":
          throw new HttpError("This contact already has that", 409);
        case "owned_by_other":
          return reply.code(409).send({
            message: "Another contact already has this. Merge them instead.",
            ownerContactId: result.ownerContactId,
          });
        default:
          return reply.send({ ok: true });
      }
    },
  );

  server.delete(
    "/:contactId/:identityId",
    { config: { permission: "contacts.manage" }, schema: { params: identityParamSchema } },
    async (
      request: FastifyRequest<{ Params: { contactId: string; identityId: string } }>,
      reply: FastifyReply,
    ) => {
      const { contactId, identityId } = request.params;
      const result = await removeIdentity(orgOf(request), contactId, identityId);
      if (result.status === "not_found") throw new HttpError("Identity not found", 404);
      if (result.status === "last_identity") {
        throw new HttpError("A contact needs at least one way to reach it", 409);
      }
      return reply.send({ ok: true });
    },
  );
}
