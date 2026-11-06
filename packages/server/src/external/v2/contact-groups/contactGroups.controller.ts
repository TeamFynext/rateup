import type { FastifyReply, FastifyRequest } from "fastify";

import { Prisma } from "../../../generated/prisma/client.js";
import { createMultipleContacts } from "../../../modules/contact/contact.service.js";
import {
  addExistingContactsToGroup,
  ContactGroupNotFoundError,
  createContactGroup,
  removeContactsFromGroup,
} from "../../../modules/contact/contactGroup/contactGroup.service.js";
import { ContactGroupType } from "../../../modules/contact/contactGroup/contactGroup.schema.js";
import { presentContact } from "../contacts/presenters.js";
import { ExternalApiError } from "../../shared/errors.js";
import { decodeCursor, toPage, type PaginationQuery } from "../pagination.js";
import * as svc from "./contactGroups.service.js";
import type {
  ContactGroupIdParams,
  ContactGroupListQuery,
  ContactIdsBody,
  CreateContactGroupBody,
  ImportContactsBody,
  UpdateContactGroupBody,
} from "./contactGroups.schema.js";
import { presentContactGroup, presentContactGroupDetail } from "./presenters.js";

const groupGone = () => new ExternalApiError(404, "contact_group_not_found", "No such audience");

/**
 * The dashboard service re-checks the group and throws its own error. Between our check and
 * its, the group can be deleted; that is a 404, not the 500 an unknown error class becomes.
 */
async function addMembers(orgId: string, contactGroupId: string, contactIds: string[]) {
  if (!contactIds.length) return 0;
  try {
    const { added } = await addExistingContactsToGroup(
      contactGroupId,
      contactIds,
      undefined,
      orgId,
    );
    return added;
  } catch (err) {
    if (err instanceof ContactGroupNotFoundError) throw groupGone();
    throw err;
  }
}

// ---- groups ------------------------------------------------------------------

export async function listContactGroupsHandler(
  request: FastifyRequest<{ Querystring: ContactGroupListQuery }>,
) {
  const { limit, cursor, ...filter } = request.query;
  const rows = await svc.listGroups(request.user.orgId, filter, decodeCursor(cursor), limit + 1);
  return toPage(rows, limit, presentContactGroup);
}

export async function getContactGroupHandler(
  request: FastifyRequest<{ Params: ContactGroupIdParams }>,
) {
  return presentContactGroupDetail(
    await svc.findGroup(request.user.orgId, request.params.contactGroupId),
  );
}

export async function createContactGroupHandler(
  request: FastifyRequest<{ Body: CreateContactGroupBody }>,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  try {
    // Through the dashboard service: it is what checks the team belongs to the org.
    // LOYALTY groups are the loyalty programme's own; partners make plain groups.
    const group = await createContactGroup(
      { ...request.body, tags: request.body.tags, type: ContactGroupType.NORMAL },
      orgId,
    );
    reply.code(201);
    return presentContactGroupDetail({ ...group, _count: { contacts: 0 } });
  } catch (err) {
    if (err instanceof ContactGroupNotFoundError) {
      throw new ExternalApiError(404, "team_not_found", "No such team");
    }
    throw err;
  }
}

export async function updateContactGroupHandler(
  request: FastifyRequest<{ Params: ContactGroupIdParams; Body: UpdateContactGroupBody }>,
) {
  const { name, icon, tags } = request.body;
  const group = await svc.updateGroup(request.user.orgId, request.params.contactGroupId, {
    name,
    icon,
    // A JSON column is cleared with DbNull; a bare `null` is not a valid Json input.
    tags: tags === null ? Prisma.DbNull : (tags as Prisma.InputJsonValue | undefined),
  });
  return presentContactGroupDetail(group);
}

export async function deleteContactGroupHandler(
  request: FastifyRequest<{ Params: ContactGroupIdParams }>,
  reply: FastifyReply,
) {
  await svc.deleteGroup(request.user.orgId, request.params.contactGroupId);
  return reply.code(204).send();
}

// ---- members -----------------------------------------------------------------

export async function listGroupContactsHandler(
  request: FastifyRequest<{ Params: ContactGroupIdParams; Querystring: PaginationQuery }>,
) {
  const { orgId } = request.user;
  const { contactGroupId } = request.params;
  const { limit, cursor } = request.query;
  await svc.assertGroup(orgId, contactGroupId);
  const rows = await svc.listMembers(orgId, contactGroupId, decodeCursor(cursor), limit + 1);
  return toPage(rows, limit, presentContact);
}

/**
 * Ownership is checked here, not trusted to the service: `addExistingContactsToGroup` does
 * filter to the org's contacts, but only reports a `skipped` count, and a partner needs to
 * know *which* ids were refused.
 */
export async function addGroupContactsHandler(
  request: FastifyRequest<{ Params: ContactGroupIdParams; Body: ContactIdsBody }>,
) {
  const { orgId } = request.user;
  const { contactGroupId } = request.params;
  await svc.assertGroup(orgId, contactGroupId);

  const ids = [...new Set(request.body.contactIds)];
  const owned = await svc.ownedContactIds(orgId, ids);
  const ownedIds = ids.filter((id) => owned.has(id));
  const added = await addMembers(orgId, contactGroupId, ownedIds);

  return {
    added,
    alreadyMembers: ownedIds.length - added,
    notFound: ids.filter((id) => !owned.has(id)),
  };
}

export async function removeGroupContactsHandler(
  request: FastifyRequest<{ Params: ContactGroupIdParams; Body: ContactIdsBody }>,
) {
  const { orgId } = request.user;
  const { contactGroupId } = request.params;
  await svc.assertGroup(orgId, contactGroupId);
  // The service's delete is scoped to the org's group, so a foreign id simply matches nothing.
  const { count } = await removeContactsFromGroup(contactGroupId, orgId, [
    ...new Set(request.body.contactIds),
  ]);
  return { removed: count };
}

/**
 * Create-or-reuse by phone, then add every resolved contact to the group.
 *
 * An existing contact is matched and left as it is — this route never overwrites a name or
 * email the business has already got. Rows repeating a phone collapse onto the first.
 */
export async function importGroupContactsHandler(
  request: FastifyRequest<{ Params: ContactGroupIdParams; Body: ImportContactsBody }>,
) {
  const { orgId } = request.user;
  const { contactGroupId } = request.params;
  await svc.assertGroup(orgId, contactGroupId);

  const byPhone = new Map<string, ImportContactsBody["contacts"][number]>();
  for (const contact of request.body.contacts) {
    if (!byPhone.has(contact.phone)) byPhone.set(contact.phone, contact);
  }
  const phones = [...byPhone.keys()];

  const slugs = [
    ...new Set([...byPhone.values()].flatMap((c) => Object.keys(c.customFields ?? {}))),
  ];
  const fieldIds = await svc.customFieldIdsBySlug(orgId, slugs);
  const unknown = slugs.filter((slug) => !fieldIds.has(slug));
  if (unknown.length) {
    throw new ExternalApiError(400, "validation_failed", "Unknown custom field slugs", {
      unknownCustomFields: unknown,
    });
  }

  const existing = await svc.contactsByPhone(orgId, phones);
  const toCreate = phones.filter((phone) => !existing.has(phone));

  const created = new Map<string, string>();
  if (toCreate.length) {
    // The dashboard's bulk create, for its side effects (custom field values, the
    // `contact.created` integration event). Only fields resolved here are passed: its
    // labels / groups / assignees inputs are not org-checked.
    const rows = await createMultipleContacts(
      toCreate.map((phone) => {
        const c = byPhone.get(phone)!;
        return {
          phone,
          name: c.name ?? "",
          email: c.email,
          external_id: c.externalId,
          source: "external",
          customFields: Object.entries(c.customFields ?? {}).map(([slug, value]) => ({
            id: fieldIds.get(slug)!,
            value,
          })),
        };
      }),
      orgId,
    );
    for (const row of rows) if (row.phone) created.set(row.phone, row.id);
  }

  // A row the create skipped either lost a race to a concurrent create of the same phone
  // (now existing) or collided on another unique column — in practice `externalId`.
  const unresolved = toCreate.filter((phone) => !created.has(phone));
  const raced = await svc.contactsByPhone(orgId, unresolved);

  const results = phones.map((phone) => {
    const createdId = created.get(phone);
    if (createdId) return { phone, contactId: createdId, status: "created" as const, reason: null };
    const existingId = existing.get(phone) ?? raced.get(phone);
    if (existingId) {
      return { phone, contactId: existingId, status: "existing" as const, reason: null };
    }
    return {
      phone,
      contactId: null,
      status: "failed" as const,
      reason: byPhone.get(phone)?.externalId ? "external_id_conflict" : "conflict",
    };
  });

  const memberIds = results.flatMap((r) => (r.contactId ? [r.contactId] : []));
  const added = await addMembers(orgId, contactGroupId, memberIds);

  return {
    created: created.size,
    existing: results.filter((r) => r.status === "existing").length,
    added,
    alreadyMembers: memberIds.length - added,
    contacts: results,
  };
}
