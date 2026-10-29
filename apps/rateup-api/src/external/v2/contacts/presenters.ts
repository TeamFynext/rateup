import type { Prisma } from "../../../../generated/prisma/client.js";
import { toWirePhone } from "../phone.js";
import type { ContactView } from "./contacts.schema.js";

/**
 * Contact rows → the public contact. Contact carries every inbox column there is (assignment,
 * last-message metadata, Meta AI thread state, spam flags); none of that is a partner's
 * business, and a spread is how it used to reach them. Select with `contactSelect` and map
 * with `presentContact`.
 */
export const contactSelect = {
  id: true,
  name: true,
  phone: true,
  bsuid: true,
  whatsappUserName: true,
  email: true,
  external_id: true,
  source: true,
  consent: true,
  createdAt: true,
  ContactLabelMap: { select: { label: { select: { id: true, name: true } } } },
  customFields: { select: { value: true, field: { select: { slug: true } } } },
} satisfies Prisma.ContactSelect;

type ContactRow = Prisma.ContactGetPayload<{ select: typeof contactSelect }>;

export function presentContact(row: ContactRow): ContactView {
  return {
    id: row.id,
    name: row.name,
    phone: toWirePhone(row.phone),
    businessScopedUserId: row.bsuid ?? null,
    whatsappUsername: row.whatsappUserName ?? null,
    email: row.email,
    externalId: row.external_id,
    source: row.source,
    consent: row.consent,
    labels: row.ContactLabelMap.map(({ label }) => ({ id: label.id, name: label.name })),
    customFields: Object.fromEntries(row.customFields.map((cf) => [cf.field.slug, cf.value])),
    createdAt: row.createdAt.toISOString(),
  };
}
