import { storedPhoneSpellings, toWirePhone } from "../phone.js";
import type { FastifyReply, FastifyRequest } from "fastify";

import type { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { emitIntegrationEvent } from "../../../modules/integrations/events/emitIntegrationEvent.js";
import {
  createContact,
  createMultipleContacts,
  deleteContactById,
} from "../../../modules/contact/contact.service.js";
import type { ContactCore } from "../../../modules/contact/contact.schema.js";
import { ExternalApiError } from "../../shared/errors.js";
import { cursorOrderBy, cursorWhere, decodeCursor, toPage } from "../pagination.js";
import { contactSelect, presentContact, presentContactDetail } from "./presenters.js";
import type {
  BulkCreateContactsBody,
  BulkSkipReason,
  ContactIdParams,
  ContactListQuery,
  CreateContactBody,
  UpdateContactBody,
} from "./contacts.schema.js";
import {
  loadContact,
  loadContactDetail,
  resolveContactRefs,
  toCustomFieldInputs,
  type ResolvedRefs,
} from "./contacts.service.js";

/** Every contact made through the partner API is stamped with this source. */
const SOURCE = "external";

export async function listContactsHandler(
  request: FastifyRequest<{ Querystring: ContactListQuery }>,
) {
  const { limit, cursor, search, labelId, contactGroupId } = request.query;
  const and: Prisma.ContactWhereInput[] = [cursorWhere(decodeCursor(cursor))];
  if (search) {
    const digits = search.replace(/\D/g, "");
    and.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        // Phones are stored as digits only, so "+91 98765" has to match "9198765…".
        ...(digits ? [{ phone: { contains: digits } }] : []),
      ],
    });
  }
  if (labelId) and.push({ ContactLabelMap: { some: { labelId } } });
  if (contactGroupId) and.push({ contactGroups: { some: { contactGroupId } } });

  const rows = await prisma.contact.findMany({
    where: { orgId: request.user.orgId, AND: and },
    select: contactSelect,
    orderBy: cursorOrderBy,
    take: limit + 1,
  });
  return toPage(rows, limit, presentContact);
}

export async function getContactHandler(request: FastifyRequest<{ Params: ContactIdParams }>) {
  return presentContactDetail(
    await loadContactDetail(request.user.orgId, request.params.contactId),
  );
}

/** The dashboard's create input for one partner body. */
function toContactCore(body: CreateContactBody, refs: ResolvedRefs, orgId: string) {
  return {
    orgId,
    phone: body.phone,
    // Contact.name is nullable; ContactCore types it as required only because the
    // dashboard form always sends one.
    name: (body.name ?? null) as ContactCore["name"],
    email: body.email,
    external_id: body.externalId,
    source: SOURCE,
    labels: body.labels,
    customFields: toCustomFieldInputs(body.customFields, refs),
  } satisfies ContactCore & { orgId: string };
}

export async function createContactHandler(
  request: FastifyRequest<{ Body: CreateContactBody }>,
  reply: FastifyReply,
) {
  const orgId = request.user.orgId;
  const body = request.body;
  const refs = await resolveContactRefs(orgId, [{ path: "", ...body }]);

  // Answered here so the caller learns which contact it collided with; the unique index
  // still catches a race, as a plain 409 contact_already_exists from the error handler.
  const existing = await prisma.contact.findFirst({
    where: {
      orgId,
      OR: [
        { phone: { in: storedPhoneSpellings(body.phone) } },
        ...(body.externalId ? [{ external_id: body.externalId }] : []),
      ],
    },
    select: { id: true, phone: true },
  });
  if (existing) {
    throw new ExternalApiError(409, "contact_already_exists", "That contact already exists", {
      contactId: existing.id,
      field: toWirePhone(existing.phone) === body.phone ? "phone" : "externalId",
    });
  }

  // The service, not a Prisma insert: a single create runs the org's CONTACT_CREATED
  // automation and integration events, as it always has from this route.
  const created = await createContact(toContactCore(body, refs, orgId), request.userId);
  reply.code(201);
  return presentContact(await loadContact(orgId, created.id));
}

export async function bulkCreateContactsHandler(
  request: FastifyRequest<{ Body: BulkCreateContactsBody }>,
) {
  const orgId = request.user.orgId;
  const { contacts } = request.body;
  const refs = await resolveContactRefs(
    orgId,
    contacts.map((c, i) => ({ path: `/contacts/${i}`, ...c })),
  );

  const skipped: { index: number; phone: string; reason: BulkSkipReason }[] = [];
  const skip = (index: number, reason: BulkSkipReason) =>
    skipped.push({ index, phone: contacts[index]!.phone, reason });

  // Within the payload: the first occurrence of a phone (or external id) wins.
  const seenPhones = new Set<string>();
  const seenExternalIds = new Set<string>();
  const candidates: number[] = [];
  contacts.forEach((c, i) => {
    if (seenPhones.has(c.phone) || (c.externalId && seenExternalIds.has(c.externalId))) {
      skip(i, "duplicate_in_request");
      return;
    }
    seenPhones.add(c.phone);
    if (c.externalId) seenExternalIds.add(c.externalId);
    candidates.push(i);
  });

  const externalIds = candidates.flatMap((i) => contacts[i]!.externalId ?? []);
  const existing = await prisma.contact.findMany({
    where: {
      orgId,
      OR: [
        { phone: { in: candidates.flatMap((i) => storedPhoneSpellings(contacts[i]!.phone)) } },
        ...(externalIds.length ? [{ external_id: { in: externalIds } }] : []),
      ],
    },
    select: { phone: true, external_id: true },
  });
  const takenPhones = new Set(existing.map((e) => toWirePhone(e.phone)));
  const takenExternalIds = new Set(existing.map((e) => e.external_id));

  const toCreate = candidates.filter((i) => {
    const c = contacts[i]!;
    if (takenPhones.has(c.phone) || (c.externalId && takenExternalIds.has(c.externalId))) {
      skip(i, "already_exists");
      return false;
    }
    return true;
  });

  // The dashboard's bulk path (createManyAndReturn + skipDuplicates). Unlike the single
  // create it runs no automations, which is what an import of a thousand rows wants.
  const created = toCreate.length
    ? await createMultipleContacts(
        toCreate.map((i) => toContactCore(contacts[i]!, refs, orgId)),
        orgId,
      )
    : [];

  // Anything we sent that did not come back lost a race to a concurrent insert.
  const createdPhones = new Set(created.map((c) => c.phone));
  for (const i of toCreate) {
    if (!createdPhones.has(contacts[i]!.phone)) skip(i, "already_exists");
  }

  const rows = created.length
    ? await prisma.contact.findMany({
        where: { orgId, id: { in: created.map((c) => c.id) } },
        select: contactSelect,
      })
    : [];
  const byPhone = new Map(rows.map((r) => [r.phone, r]));

  skipped.sort((a, b) => a.index - b.index);
  return {
    // In request order.
    created: toCreate.flatMap((i) => {
      const row = byPhone.get(contacts[i]!.phone);
      return row ? [presentContact(row)] : [];
    }),
    skipped,
  };
}

/**
 * Written here rather than through the dashboard's `updateContactById`. That function is
 * the inbox's status machine as much as a contact update: whenever the contact's current
 * status is a closed one, *every* call re-emits `conversation.closed`, clears the
 * assignees and notifies them — so a partner renaming a closed contact would page staff.
 */
export async function updateContactHandler(
  request: FastifyRequest<{ Params: ContactIdParams; Body: UpdateContactBody }>,
) {
  const orgId = request.user.orgId;
  const { contactId } = request.params;
  const body = request.body;

  await loadContact(orgId, contactId);
  const refs = await resolveContactRefs(orgId, [{ path: "", ...body }]);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.contact.update({
      where: { id: contactId, orgId },
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email,
        external_id: body.externalId,
      },
    });

    if (body.labels) {
      await tx.contactLabelMap.deleteMany({ where: { contactId } });
      if (body.labels.length) {
        await tx.contactLabelMap.createMany({
          data: body.labels.map((labelId) => ({ contactId, labelId })),
          skipDuplicates: true,
        });
      }
    }

    if (body.customFields) {
      const entries = Object.entries(body.customFields);
      await tx.contactCustomFieldValue.deleteMany({
        where: {
          contactId,
          fieldId: { in: entries.map(([slug]) => refs.fieldIdBySlug.get(slug)!) },
        },
      });
      const values = entries.flatMap(([slug, value]) =>
        value === null ? [] : [{ contactId, fieldId: refs.fieldIdBySlug.get(slug)!, value }],
      );
      if (values.length) await tx.contactCustomFieldValue.createMany({ data: values });
    }

    return row;
  });

  await emitIntegrationEvent(orgId, {
    type: "contact.updated",
    contact: updated,
    changed: ["details"],
  });

  return presentContact(await loadContact(orgId, contactId));
}

export async function deleteContactHandler(request: FastifyRequest<{ Params: ContactIdParams }>) {
  const orgId = request.user.orgId;
  const { contactId } = request.params;
  await loadContact(orgId, contactId);
  try {
    // The service, for its contact.deleted integration event.
    await deleteContactById(contactId, orgId);
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      throw new ExternalApiError(404, "contact_not_found", "No such contact");
    }
    throw error;
  }
  return { id: contactId, deleted: true as const };
}
