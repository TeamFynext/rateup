import type { Prisma } from "../../../generated/prisma/client.js";

/**
 * ContactGroup rows → the public group. Allowlisted field by field, so a new column on
 * ContactGroup never joins the public contract by accident.
 */
export const contactGroupSelect = {
  id: true,
  name: true,
  icon: true,
  tags: true,
  teamId: true,
  type: true,
  createdAt: true,
} satisfies Prisma.ContactGroupSelect;

type ContactGroupRow = Prisma.ContactGroupGetPayload<{ select: typeof contactGroupSelect }>;

/** `tags` is a JSON column; only a plain object is part of the contract. */
function presentTags(tags: unknown): Record<string, unknown> | null {
  return tags && typeof tags === "object" && !Array.isArray(tags)
    ? (tags as Record<string, unknown>)
    : null;
}

export function presentContactGroup(row: ContactGroupRow) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    tags: presentTags(row.tags),
    teamId: row.teamId,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
  };
}

export function presentContactGroupDetail(row: ContactGroupRow & { _count: { contacts: number } }) {
  return { ...presentContactGroup(row), memberCount: row._count.contacts };
}
