import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

import type { Prisma } from "../../../../generated/prisma/client.js";
import {
  ContactIdentityKind,
  ContactIdentitySource,
  PlatformType,
} from "../../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import { HttpError } from "../../../utils/http.js";
import { emitIntegrationEvent } from "../../../modules/integrations/events/emitIntegrationEvent.js";
import {
  attachIdentity,
  findContactIdByIdentity,
  identitiesFromContact,
  LEGACY_COLUMN,
  listContactIdentities,
  normalizeIdentityValue,
  removeIdentity,
  syncLegacyColumn,
} from "../../../modules/contact/identity/identity.service.js";
import { mergeContacts } from "../../../modules/contact/merge/merge.service.js";
import { suggestMerge } from "../../../modules/contact/merge/suggestions.service.js";
import type { MergeFieldChoices } from "../../../modules/contact/merge/merge.types.js";
import { ExternalApiError } from "../../shared/errors.js";
import { phoneSchema, storedPhoneSpellings } from "../phone.js";
import type {
  AddContactIdentityBody,
  ContactIdParams,
  ContactIdentityParams,
  ContactLookupQuery,
  MergeContactBody,
} from "./contacts.schema.js";
import { loadContactDetail, resolveContactRefs } from "./contacts.service.js";
import {
  contactDetailSelect,
  identitySelect,
  presentContactDetail,
  presentIdentity,
} from "./presenters.js";

/**
 * Contact identities and merge on the partner API (rateup/contact-identity-plan.md §6).
 *
 * The rules live in the contact identity and merge services; this file only translates
 * them into the partner contract — the error envelope, the org from the key, public shapes.
 */

const CHANNEL_SCOPED: ContactIdentityKind[] = [
  ContactIdentityKind.IG_SCOPED,
  ContactIdentityKind.FB_PSID,
  ContactIdentityKind.WEBCHAT,
];

/** The legacy columns a contact's identities are read from before it is backfilled. */
const legacySelect = {
  id: true,
  phone: true,
  email: true,
  bsuid: true,
  igsId: true,
  psid: true,
  external_id: true,
  whatsappUserName: true,
} satisfies Prisma.ContactSelect;

async function loadLegacyContact(orgId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, orgId },
    select: legacySelect,
  });
  if (!contact) throw new ExternalApiError(404, "contact_not_found", "No such contact");
  return contact;
}

/** The value as stored, or a 400 naming the field. */
function normalizedValue(kind: ContactIdentityKind, raw: string, path: string): string {
  if (kind === ContactIdentityKind.PHONE) {
    const parsed = phoneSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ExternalApiError(400, "phone_invalid", "Not a valid phone number", {
        issues: [{ path, message: "Not a valid phone number with a country code" }],
      });
    }
    return parsed.data;
  }
  const value = normalizeIdentityValue(kind, raw);
  const valid = kind === ContactIdentityKind.EMAIL ? z.email().safeParse(value).success : !!value;
  if (!valid) {
    throw new ExternalApiError(400, "validation_failed", "Request validation failed", {
      issues: [{ path, message: kind === ContactIdentityKind.EMAIL ? "Invalid email" : "Empty" }],
    });
  }
  return value;
}

/**
 * Where the legacy columns would hold this identity, for contacts not backfilled yet. Null
 * for an EXTERNAL id from a named integration: only `externalId` has a column.
 */
function legacyWhere(
  kind: ContactIdentityKind,
  value: string,
  integration?: string,
): Prisma.ContactWhereInput | null {
  switch (kind) {
    case ContactIdentityKind.PHONE:
      return { phone: { in: storedPhoneSpellings(value) } };
    case ContactIdentityKind.EMAIL:
      return { email: { equals: value, mode: "insensitive" } };
    case ContactIdentityKind.WA_BSUID:
      return { bsuid: value };
    case ContactIdentityKind.IG_SCOPED:
      return { igsId: value };
    case ContactIdentityKind.FB_PSID:
      return { psid: value };
    case ContactIdentityKind.WEBCHAT:
      return { other: value, source: PlatformType.WEBCHAT };
    case ContactIdentityKind.EXTERNAL:
      return !integration || integration === "external_id" ? { external_id: value } : null;
    default:
      return null;
  }
}

/** The contact holding an identity, narrowed to a channel or integration when one is named. */
async function identityOwner(
  orgId: string,
  kind: ContactIdentityKind,
  value: string,
  { channelId, integration }: { channelId?: string; integration?: string },
): Promise<string | null> {
  // An id recorded before its channel was known has scope "", and still counts.
  const scope =
    channelId && CHANNEL_SCOPED.includes(kind)
      ? { in: [channelId, ""] }
      : integration && kind === ContactIdentityKind.EXTERNAL
        ? integration
        : undefined;
  if (scope === undefined) return findContactIdByIdentity(orgId, kind, value);
  const row = await prisma.contactIdentity.findFirst({
    where: { orgId, kind, value, scope },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: { contactId: true },
  });
  return row?.contactId ?? null;
}

// ---- lookup --------------------------------------------------------------------------------

/**
 * Any identity → its contact. Identities first (a merged contact's second phone or second
 * Instagram id is only there), then the legacy columns, exactly as inbound messages resolve.
 */
export async function lookupContactHandler(
  request: FastifyRequest<{ Querystring: ContactLookupQuery }>,
) {
  const orgId = request.user.orgId;
  const { phone, channelId, integration } = request.query;
  const kind = phone !== undefined ? ContactIdentityKind.PHONE : request.query.kind!;
  const value = phone !== undefined ? phone : normalizedValue(kind, request.query.value!, "/value");

  const ownerId = await identityOwner(orgId, kind, value, { channelId, integration });
  const contact = ownerId
    ? await prisma.contact.findFirst({ where: { id: ownerId, orgId }, select: contactDetailSelect })
    : null;
  const where = contact ? null : legacyWhere(kind, value, integration);
  const found =
    contact ??
    (where
      ? await prisma.contact.findFirst({ where: { ...where, orgId }, select: contactDetailSelect })
      : null);
  if (!found) {
    throw new ExternalApiError(404, "contact_not_found", "No contact has that identity");
  }
  return presentContactDetail(found);
}

// ---- identities ----------------------------------------------------------------------------

export async function listContactIdentitiesHandler(
  request: FastifyRequest<{ Params: ContactIdParams }>,
) {
  const orgId = request.user.orgId;
  const { contactId } = request.params;
  await loadLegacyContact(orgId, contactId);
  const rows = await listContactIdentities(orgId, contactId);
  return { data: rows.map(presentIdentity) };
}

/** Tells the CRMs when an identity change moved the contact's phone or email. */
async function emitIfColumnChanged(
  orgId: string,
  before: Record<string, unknown>,
  kind: ContactIdentityKind,
) {
  const column = LEGACY_COLUMN[kind];
  if (!column) return;
  const after = await prisma.contact.findFirst({ where: { id: before.id as string, orgId } });
  if (after && after[column] !== before[column]) {
    await emitIntegrationEvent(orgId, {
      type: "contact.updated",
      contact: after,
      changed: ["details"],
    });
  }
}

export async function addContactIdentityHandler(
  request: FastifyRequest<{ Params: ContactIdParams; Body: AddContactIdentityBody }>,
  reply: FastifyReply,
) {
  const orgId = request.user.orgId;
  const { contactId } = request.params;
  const { kind, integration } = request.body;
  const contact = await loadLegacyContact(orgId, contactId);
  const value = normalizedValue(kind, request.body.value, "/value");

  // Held by someone else — as an identity, or only in a legacy column — is a 409 naming
  // them. Nothing moves: joining two contacts is a merge, and the caller can ask for one.
  const where = legacyWhere(kind, value, integration);
  const holder =
    (await identityOwner(orgId, kind, value, { integration })) ??
    (where
      ? (
          await prisma.contact.findFirst({
            where: { ...where, orgId, id: { not: contactId } },
            select: { id: true },
          })
        )?.id
      : null);
  const inUse = (ownerContactId: string): never => {
    throw new ExternalApiError(
      409,
      "identity_in_use",
      "Another contact already has that identity",
      {
        contactId: ownerContactId,
      },
    );
  };
  if (holder && holder !== contactId) {
    if (kind !== ContactIdentityKind.EXTERNAL) {
      await suggestMerge(orgId, contactId, holder, {
        reason: kind === ContactIdentityKind.EMAIL ? "SAME_EMAIL" : "SAME_PHONE",
        detail: value,
      });
    }
    inUse(holder);
  }

  // A contact not backfilled yet holds its phone/email only in the column: record that one
  // first, so it stays the primary and the column is not overwritten by the new value.
  for (const input of identitiesFromContact(contact)) {
    if (input.kind === kind) await attachIdentity(orgId, contactId, input);
  }

  const result = await attachIdentity(orgId, contactId, {
    kind,
    value,
    integration,
    source: ContactIdentitySource.IMPORT,
    // An integration's own id is as good as the integration; a typed phone or email is not
    // proven until the customer uses it.
    verified: kind === ContactIdentityKind.EXTERNAL,
  });
  if (!result) {
    throw new ExternalApiError(400, "validation_failed", "Request validation failed", {
      issues: [{ path: "/value", message: "Empty" }],
    });
  }
  if (result.status === "owned_by_other") inUse(result.ownerContactId);

  if (LEGACY_COLUMN[kind]) await syncLegacyColumn(contactId, kind);
  await emitIfColumnChanged(orgId, contact, kind);

  const row = await prisma.contactIdentity.findFirst({
    where: { id: result.identityId, orgId, contactId },
    select: identitySelect,
  });
  if (!row) throw new ExternalApiError(404, "identity_not_found", "No such identity");
  reply.code(result.status === "attached" ? 201 : 200);
  return presentIdentity(row);
}

export async function removeContactIdentityHandler(
  request: FastifyRequest<{ Params: ContactIdentityParams }>,
) {
  const orgId = request.user.orgId;
  const { contactId, identityId } = request.params;
  const contact = await loadLegacyContact(orgId, contactId);
  const kind = (
    await prisma.contactIdentity.findFirst({
      where: { id: identityId, contactId, orgId },
      select: { kind: true },
    })
  )?.kind;

  const result = await removeIdentity(orgId, contactId, identityId);
  if (result.status === "not_found" || !kind) {
    throw new ExternalApiError(404, "identity_not_found", "No such identity");
  }
  if (result.status === "last_identity") {
    throw new ExternalApiError(
      409,
      "last_identity",
      "A contact keeps at least one identity; delete the contact instead",
    );
  }
  await emitIfColumnChanged(orgId, contact, kind);
  return { id: identityId, deleted: true as const };
}

// ---- merge ---------------------------------------------------------------------------------

/** The partner's choices (custom fields by slug) → the merge service's (by field id). */
async function toMergeFieldChoices(
  orgId: string,
  choices: MergeContactBody["fieldChoices"],
): Promise<MergeFieldChoices> {
  if (!choices) return {};
  const { customFields, ...fields } = choices;
  const out: MergeFieldChoices = {};
  for (const [field, side] of Object.entries(fields)) {
    if (side) out[field as keyof typeof fields] = side;
  }
  if (customFields && Object.keys(customFields).length) {
    const refs = await resolveContactRefs(orgId, [{ path: "/fieldChoices", customFields }]);
    for (const [slug, side] of Object.entries(customFields)) {
      out[`custom:${refs.fieldIdBySlug.get(slug)!}`] = side;
    }
  }
  return out;
}

/**
 * Merges `sourceContactId` into the contact in the path, which survives. Retrying without an
 * Idempotency-Key is harmless: the source is gone, so the retry is a 404 naming it.
 */
export async function mergeContactHandler(
  request: FastifyRequest<{ Params: ContactIdParams; Body: MergeContactBody }>,
) {
  const orgId = request.user.orgId;
  const targetId = request.params.contactId;
  const { sourceContactId } = request.body;
  if (sourceContactId === targetId) {
    throw new ExternalApiError(400, "validation_failed", "A contact cannot be merged into itself", {
      issues: [{ path: "/sourceContactId", message: "Must differ from the contact in the path" }],
    });
  }

  const found = await prisma.contact.findMany({
    where: { orgId, id: { in: [targetId, sourceContactId] } },
    select: { id: true },
  });
  for (const id of [targetId, sourceContactId]) {
    if (!found.some((c) => c.id === id)) {
      throw new ExternalApiError(404, "contact_not_found", "No such contact", { contactId: id });
    }
  }

  const fieldChoices = await toMergeFieldChoices(orgId, request.body.fieldChoices);
  try {
    await mergeContacts(
      orgId,
      sourceContactId,
      targetId,
      { userId: null, reason: "API" },
      fieldChoices,
    );
  } catch (error) {
    // Lost a race with another merge or a delete between the check above and the lock.
    if (error instanceof HttpError && error.statusCode === 404) {
      throw new ExternalApiError(404, "contact_not_found", "No such contact");
    }
    throw error;
  }
  return presentContactDetail(await loadContactDetail(orgId, targetId));
}
