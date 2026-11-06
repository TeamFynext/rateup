import type { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { ExternalApiError } from "../../shared/errors.js";
import { contactDetailSelect, contactSelect } from "./presenters.js";

/**
 * Prisma access for the partner contacts API. Every query here takes the org id and puts it
 * in the `where`; nothing in this file looks a row up by id alone.
 */

export function findContact(orgId: string, where: Prisma.ContactWhereInput) {
  return prisma.contact.findFirst({ where: { ...where, orgId }, select: contactSelect });
}

export async function loadContact(orgId: string, contactId: string) {
  const contact = await findContact(orgId, { id: contactId });
  if (!contact) throw new ExternalApiError(404, "contact_not_found", "No such contact");
  return contact;
}

/** A contact with its identities, for single-contact answers. 404 when not the org's. */
export async function loadContactDetail(orgId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, orgId },
    select: contactDetailSelect,
  });
  if (!contact) throw new ExternalApiError(404, "contact_not_found", "No such contact");
  return contact;
}

/** One body's references, and where in the request it sits (a JSON pointer prefix). */
export interface ContactRefs {
  path: string;
  customFields?: Record<string, unknown>;
  labels?: string[];
}

export interface ResolvedRefs {
  /** Custom field slug → ContactCustomField id, for the org. */
  fieldIdBySlug: Map<string, string>;
}

/**
 * Checks every custom field slug and label id a request names against the org, in two
 * queries however many contacts the request carries, and refuses the whole request with
 * each bad reference listed. The dashboard's create paths take label and custom field ids
 * on trust; reaching them unchecked from here would let a key attach another org's label.
 */
export async function resolveContactRefs(orgId: string, bodies: ContactRefs[]) {
  const slugs = new Set<string>();
  const labelIds = new Set<string>();
  for (const body of bodies) {
    for (const slug of Object.keys(body.customFields ?? {})) slugs.add(slug);
    for (const id of body.labels ?? []) labelIds.add(id);
  }

  const [fields, labels] = await Promise.all([
    slugs.size
      ? prisma.contactCustomField.findMany({
          where: { orgId, slug: { in: [...slugs] } },
          select: { id: true, slug: true },
          // Slugs are not unique per org at the database level; the oldest field wins.
          orderBy: { createdAt: "asc" },
        })
      : [],
    labelIds.size
      ? prisma.contactLabel.findMany({
          where: { orgId, id: { in: [...labelIds] } },
          select: { id: true },
        })
      : [],
  ]);

  const fieldIdBySlug = new Map<string, string>();
  for (const field of fields) {
    if (!fieldIdBySlug.has(field.slug)) fieldIdBySlug.set(field.slug, field.id);
  }
  const knownLabels = new Set(labels.map((l) => l.id));

  const issues: { path: string; message: string }[] = [];
  for (const body of bodies) {
    for (const slug of Object.keys(body.customFields ?? {})) {
      if (!fieldIdBySlug.has(slug)) {
        issues.push({ path: `${body.path}/customFields/${slug}`, message: "Unknown custom field" });
      }
    }
    (body.labels ?? []).forEach((id, i) => {
      if (!knownLabels.has(id)) {
        issues.push({ path: `${body.path}/labels/${i}`, message: "Unknown label" });
      }
    });
  }
  if (issues.length) {
    throw new ExternalApiError(400, "validation_failed", "Request validation failed", {
      // Bounded: a 1000-contact body with one bad slug each would otherwise echo 1000 lines.
      issues: issues.slice(0, 100),
    });
  }

  return { fieldIdBySlug } satisfies ResolvedRefs;
}

/** `{ slug: value }` → the `[{ id, value }]` the dashboard's contact services take. */
export function toCustomFieldInputs(
  customFields: Record<string, string> | undefined,
  { fieldIdBySlug }: ResolvedRefs,
) {
  return Object.entries(customFields ?? {}).map(([slug, value]) => ({
    id: fieldIdBySlug.get(slug)!,
    value,
  }));
}
