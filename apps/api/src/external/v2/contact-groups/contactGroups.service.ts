import type { Prisma } from "../../../generated/prisma/client.js";
import { ContactIdentityKind } from "../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import { contactSelect } from "../contacts/presenters.js";
import { ExternalApiError } from "../../shared/errors.js";
import { cursorOrderBy, cursorWhere, type Cursor } from "../pagination.js";
import { contactGroupSelect } from "./presenters.js";

/**
 * Queries the partner API needs that the dashboard service does not have. Every one of them
 * goes through the group's team's `orgId` (ContactGroup has no `orgId` of its own) or the
 * contact's `orgId`; nothing here looks a row up by id alone.
 */

const groupInOrg = (orgId: string, contactGroupId: string): Prisma.ContactGroupWhereInput => ({
  id: contactGroupId,
  team: { orgId },
});

const notFound = () => new ExternalApiError(404, "contact_group_not_found", "No such audience");

export async function findGroup(orgId: string, contactGroupId: string) {
  const group = await prisma.contactGroup.findFirst({
    where: groupInOrg(orgId, contactGroupId),
    select: { ...contactGroupSelect, _count: { select: { contacts: true } } },
  });
  if (!group) throw notFound();
  return group;
}

/** Existence only — for the member routes, which answer about the members, not the group. */
export async function assertGroup(orgId: string, contactGroupId: string) {
  const group = await prisma.contactGroup.findFirst({
    where: groupInOrg(orgId, contactGroupId),
    select: { id: true },
  });
  if (!group) throw notFound();
}

export async function listGroups(
  orgId: string,
  filter: { search?: string; teamId?: string; type?: "NORMAL" | "LOYALTY" },
  cursor: Cursor | null,
  take: number,
) {
  return prisma.contactGroup.findMany({
    where: {
      team: { orgId },
      ...(filter.teamId ? { teamId: filter.teamId } : {}),
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.search ? { name: { contains: filter.search, mode: "insensitive" } } : {}),
      ...cursorWhere(cursor),
    },
    select: contactGroupSelect,
    orderBy: cursorOrderBy,
    take,
  });
}

/**
 * A group's members, paged on the *contact's* `(createdAt, id)`.
 *
 * ContactGroupMap is a bare join table — a composite key and no timestamp — so there is no
 * membership row to key a cursor on. The contact's own key is stable (it never changes when
 * members come and go), unique, and served by Contact's `orgId` index plus the map's
 * `contactGroupId` index. The cost is that the order is "newest contact first", not "most
 * recently added to the group"; nothing records when a contact joined.
 *
 * `orgId` on the contact as well as the group: the dashboard's bulk paths have not always
 * checked contact ownership, and a foreign contact that slipped into a group must not be
 * readable through it.
 */
export async function listMembers(
  orgId: string,
  contactGroupId: string,
  cursor: Cursor | null,
  take: number,
) {
  return prisma.contact.findMany({
    where: {
      orgId,
      contactGroups: { some: { contactGroupId } },
      ...cursorWhere(cursor),
    },
    select: contactSelect,
    orderBy: cursorOrderBy,
    take,
  });
}

/** Which of these ids are contacts of this org. */
export async function ownedContactIds(orgId: string, contactIds: string[]): Promise<Set<string>> {
  if (!contactIds.length) return new Set();
  const rows = await prisma.contact.findMany({
    where: { orgId, id: { in: contactIds } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

/** Phone (digits, as the schema hands them on) → the contact known by it. */
export async function contactsByPhone(orgId: string, phones: string[]) {
  if (!phones.length) return new Map<string, string>();
  const rows = await prisma.contactIdentity.findMany({
    where: { orgId, kind: ContactIdentityKind.PHONE, value: { in: phones } },
    select: { contactId: true, value: true },
  });
  return new Map(rows.map((r) => [r.value, r.contactId]));
}

/** Contact id → its phone, for contacts just created. */
export async function primaryPhones(contactIds: string[]) {
  if (!contactIds.length) return new Map<string, string>();
  const rows = await prisma.contactIdentity.findMany({
    where: { contactId: { in: contactIds }, kind: ContactIdentityKind.PHONE, isPrimary: true },
    select: { contactId: true, value: true },
  });
  return new Map(rows.map((r) => [r.contactId, r.value]));
}

/** Custom field slugs → ids, this org's fields only. */
export async function customFieldIdsBySlug(orgId: string, slugs: string[]) {
  if (!slugs.length) return new Map<string, string>();
  const rows = await prisma.contactCustomField.findMany({
    where: { orgId, slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  return new Map(rows.map((r) => [r.slug, r.id]));
}

export async function updateGroup(
  orgId: string,
  contactGroupId: string,
  data: Prisma.ContactGroupUpdateManyMutationInput,
) {
  // updateMany so a group outside the org is a count of 0 rather than a P2025 from a
  // relation filter inside a unique `where`. A name clash is still a P2002, which the
  // error handler names `contact_group_already_exists`.
  const { count } = await prisma.contactGroup.updateMany({
    where: groupInOrg(orgId, contactGroupId),
    data,
  });
  if (!count) throw notFound();
  return findGroup(orgId, contactGroupId);
}

export async function deleteGroup(orgId: string, contactGroupId: string) {
  const { count } = await prisma.contactGroup.deleteMany({
    where: groupInOrg(orgId, contactGroupId),
  });
  if (!count) throw notFound();
}
