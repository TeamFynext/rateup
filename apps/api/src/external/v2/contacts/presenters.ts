import type { Prisma } from "../../../../generated/prisma/client.js";
import { ContactIdentityKind } from "../../../../generated/prisma/enums.js";
import { toWirePhone } from "../phone.js";
import type { ContactDetailView, ContactIdentityView, ContactView } from "./contacts.schema.js";

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

/** The columns a public identity is built from. */
export const identitySelect = {
  id: true,
  kind: true,
  scope: true,
  value: true,
  source: true,
  verified: true,
  isPrimary: true,
  username: true,
  displayName: true,
  channelId: true,
  lastSeenAt: true,
  createdAt: true,
} satisfies Prisma.ContactIdentitySelect;

/** Primaries first within each kind, then oldest first: the order the dashboard shows. */
export const identityOrderBy = [
  { kind: "asc" },
  { isPrimary: "desc" },
  { createdAt: "asc" },
] satisfies Prisma.ContactIdentityOrderByWithRelationInput[];

type IdentityRow = Prisma.ContactIdentityGetPayload<{ select: typeof identitySelect }>;

const CHANNEL_SCOPED: ContactIdentityKind[] = [
  ContactIdentityKind.IG_SCOPED,
  ContactIdentityKind.FB_PSID,
  ContactIdentityKind.WEBCHAT,
];

/**
 * `scope` is an internal key — the channel id for per-channel kinds, the integration key for
 * EXTERNAL, "" otherwise — so it goes out split into what it means.
 */
export function presentIdentity(row: IdentityRow): ContactIdentityView {
  const channelScoped = CHANNEL_SCOPED.includes(row.kind);
  return {
    id: row.id,
    kind: row.kind,
    value:
      row.kind === ContactIdentityKind.PHONE ? (toWirePhone(row.value) ?? row.value) : row.value,
    channelId: (channelScoped && row.scope ? row.scope : null) ?? row.channelId ?? null,
    integration: row.kind === ContactIdentityKind.EXTERNAL ? row.scope || null : null,
    source: row.source,
    verified: row.verified,
    primary: row.isPrimary,
    username: row.username ?? null,
    displayName: row.displayName ?? null,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * A single contact with its identities, in the same query (one extra SELECT, batched by
 * Prisma). Only for single-contact answers: lists use `contactSelect` and stay one query per
 * page whatever the identities.
 */
export const contactDetailSelect = {
  ...contactSelect,
  identities: { select: identitySelect, orderBy: identityOrderBy },
} satisfies Prisma.ContactSelect;

type ContactDetailRow = Prisma.ContactGetPayload<{ select: typeof contactDetailSelect }>;

export function presentContactDetail(row: ContactDetailRow): ContactDetailView {
  return { ...presentContact(row), identities: row.identities.map(presentIdentity) };
}
