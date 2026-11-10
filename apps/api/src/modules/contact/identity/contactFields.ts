import { Prisma } from "../../../generated/prisma/client.js";
import { ContactIdentityKind, ContactIdentitySource } from "../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import { attachIdentity, IdentityTakenError, normalizeIdentityValue } from "./identity.service.js";

/**
 * A contact's phone, email, BSUID, Instagram id and Messenger id, read from its identities.
 *
 * These used to be columns on Contact. They are now each the contact's *primary* identity of
 * one kind (`ContactIdentity.isPrimary`, at most one per kind: a partial unique index). The
 * API still answers with `phone`, `email`, `bsuid`, `igsId` and `psid` on a contact, so the
 * dashboard, the apps and partner integrations see the same shapes as before; this module is
 * how backend code reads, filters and writes them.
 *
 * - Reading: add `primaryIdentities` to the query's `include`/`select`, then pass the row to
 *   `withContactFields` (or `contactFields` for just the five values).
 * - Filtering: `contactWhereIdentity` (exact) and `contactWhereIdentityContains` (search).
 * - Raw SQL: `primaryIdentitySql` / `primaryIdentityPgSql` for the select list,
 *   `identityExistsSql` for an exact match.
 * - Writing: `setPrimaryIdentities` after a create or an edit; `findOrCreateContactByIdentity`
 *   instead of an upsert on the old unique columns.
 */

type Db = Prisma.TransactionClient | typeof prisma;

/** The identity kinds that stand in for the old Contact columns. */
export const CONTACT_FIELD_KIND = {
  phone: ContactIdentityKind.PHONE,
  email: ContactIdentityKind.EMAIL,
  bsuid: ContactIdentityKind.WA_BSUID,
  igsId: ContactIdentityKind.IG_SCOPED,
  psid: ContactIdentityKind.FB_PSID,
} as const;

export type ContactField = keyof typeof CONTACT_FIELD_KIND;
export type ContactFields = Record<ContactField, string | null>;

const FIELD_BY_KIND = Object.fromEntries(
  Object.entries(CONTACT_FIELD_KIND).map(([field, kind]) => [kind, field]),
) as Partial<Record<ContactIdentityKind, ContactField>>;

const FIELD_KINDS = Object.values(CONTACT_FIELD_KIND);

/**
 * Put under a contact query's `include` or `select`: loads exactly the identities that the
 * five fields are read from. `{ ...primaryIdentities }` spreads in as `identities`.
 */
export const primaryIdentities = {
  identities: {
    where: { isPrimary: true, kind: { in: FIELD_KINDS } },
    select: { kind: true, value: true },
  },
} as const satisfies { identities: Prisma.Contact$identitiesArgs };

export interface PrimaryIdentityRow {
  kind: ContactIdentityKind;
  value: string;
  /** Absent when the query already kept only primaries (`primaryIdentities`). */
  isPrimary?: boolean;
}

/** The five values from a contact's primary identities. Missing kinds are null. */
export function contactFields(identities: readonly PrimaryIdentityRow[] | null | undefined) {
  const out: ContactFields = { phone: null, email: null, bsuid: null, igsId: null, psid: null };
  for (const row of identities ?? []) {
    if (row.isPrimary === false) continue;
    const field = FIELD_BY_KIND[row.kind];
    if (field && out[field] === null) out[field] = row.value;
  }
  return out;
}

/**
 * A contact row loaded with `primaryIdentities`, with the five fields added and the
 * `identities` it was read from taken off again (so a response looks as it always did).
 * Pass `{ keepIdentities: true }` when the caller asked for identities for its own use.
 */
export function withContactFields<T extends { identities?: readonly PrimaryIdentityRow[] }>(
  contact: T,
  options?: { keepIdentities?: false },
): Omit<T, "identities"> & ContactFields;
export function withContactFields<T extends { identities?: readonly PrimaryIdentityRow[] }>(
  contact: T,
  options: { keepIdentities: true },
): T & ContactFields;
export function withContactFields<T extends { identities?: readonly PrimaryIdentityRow[] }>(
  contact: T,
  options: { keepIdentities?: boolean } = {},
) {
  const fields = contactFields(contact.identities);
  if (options.keepIdentities) return { ...contact, ...fields };
  const { identities: _identities, ...rest } = contact;
  return { ...rest, ...fields };
}

/** `withContactFields` for a row that may be missing. */
export function withContactFieldsOrNull<T extends { identities?: readonly PrimaryIdentityRow[] }>(
  contact: T | null | undefined,
): (Omit<T, "identities"> & ContactFields) | null {
  return contact ? withContactFields(contact) : null;
}

/** Contacts known by this exact identifier, whatever channel scope it was recorded under. */
export function contactWhereIdentity(
  field: ContactField,
  value: string | null | undefined,
): Prisma.ContactWhereInput {
  const kind = CONTACT_FIELD_KIND[field];
  const normalized = value ? normalizeIdentityValue(kind, value) : "";
  // An empty value must match nothing, never "every contact".
  if (!normalized) return { id: { in: [] } };
  return { identities: { some: { kind, value: normalized } } };
}

/** Contacts with any identity of these kinds containing `text` (case-insensitive). */
export function contactWhereIdentityContains(
  fields: readonly ContactField[],
  text: string,
): Prisma.ContactWhereInput {
  const kinds = fields.map((field) => CONTACT_FIELD_KIND[field]);
  const needle = fields.length === 1 && fields[0] === "phone" ? text.replace(/\D/g, "") : text;
  if (!needle.trim()) return { id: { in: [] } };
  return {
    identities: { some: { kind: { in: kinds }, value: { contains: needle, mode: "insensitive" } } },
  };
}

/** Contacts that have (or lack) an identity of this kind. */
export function contactWhereHasIdentity(field: ContactField, has = true): Prisma.ContactWhereInput {
  const some = { identities: { some: { kind: CONTACT_FIELD_KIND[field] } } };
  return has ? some : { NOT: some };
}

/**
 * Prisma.sql for one field of the contact aliased `alias`, for a raw query's select list or
 * a comparison: `${primaryIdentitySql("c", "phone")} AS "phone"`. Backed by the partial
 * unique index on (contactId, kind) WHERE isPrimary, so it is one index probe per row.
 */
export function primaryIdentitySql(alias: string, field: ContactField): Prisma.Sql {
  return Prisma.raw(primaryIdentityPgSql(alias, field));
}

/** The same as a plain SQL string, for the workers' `pg` queries. */
export function primaryIdentityPgSql(alias: string, field: ContactField): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) throw new Error(`Bad SQL alias: ${alias}`);
  return `(SELECT ci."value" FROM "ContactIdentity" ci WHERE ci."contactId" = ${alias}."id" AND ci."kind" = '${CONTACT_FIELD_KIND[field]}' AND ci."isPrimary" LIMIT 1)`;
}

/** Prisma.sql: the contact aliased `alias` holds this exact identifier (any scope). */
export function identityExistsSql(alias: string, field: ContactField, value: string): Prisma.Sql {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) throw new Error(`Bad SQL alias: ${alias}`);
  const kind = CONTACT_FIELD_KIND[field];
  return Prisma.sql`EXISTS (SELECT 1 FROM "ContactIdentity" ci WHERE ci."contactId" = ${Prisma.raw(alias)}."id" AND ci."kind" = ${kind}::"ContactIdentityKind" AND ci."value" = ${normalizeIdentityValue(kind, value)})`;
}

/**
 * Makes each given value the contact's primary identity of its kind, as writing the old
 * column did. `null` removes the primary of that kind (other identities of the kind stay);
 * `undefined` leaves the kind alone. A value another contact is known by throws
 * `IdentityTakenError`, where the old unique column would have thrown P2002.
 *
 * Run it in the same transaction as the contact write when there is one.
 */
export async function setPrimaryIdentities(
  orgId: string,
  contactId: string,
  values: Partial<ContactFields>,
  source: ContactIdentitySource,
  db: Db = prisma,
  options: { channelId?: string | null; verified?: boolean } = {},
): Promise<void> {
  for (const [field, raw] of Object.entries(values) as [
    ContactField,
    string | null | undefined,
  ][]) {
    if (raw === undefined) continue;
    const kind = CONTACT_FIELD_KIND[field];
    if (raw === null || !normalizeIdentityValue(kind, raw)) {
      await db.contactIdentity.updateMany({
        where: { contactId, kind, isPrimary: true },
        data: { isPrimary: false },
      });
      continue;
    }
    const result = await attachIdentity(
      orgId,
      contactId,
      {
        kind,
        value: raw,
        source,
        channelId: options.channelId,
        verified: options.verified ?? kind !== ContactIdentityKind.EMAIL,
      },
      db,
    );
    if (!result) continue; // not a valid value of the kind (e.g. a platform id as a phone)
    if (result.status === "owned_by_other") {
      throw new IdentityTakenError(kind, normalizeIdentityValue(kind, raw), result.ownerContactId);
    }
    await db.contactIdentity.updateMany({
      where: { contactId, kind, isPrimary: true, id: { not: result.identityId } },
      data: { isPrimary: false },
    });
    await db.contactIdentity.update({
      where: { id: result.identityId },
      data: { isPrimary: true },
    });
  }
}

/**
 * The contact known by an identifier, created (with that identifier as its primary identity)
 * when there is none. Replaces `contact.upsert` on the old unique columns: a concurrent
 * creator of the same identity makes this one's insert roll back, and the winner is returned.
 */
export async function findOrCreateContactByIdentity<S extends Prisma.ContactSelect>(
  orgId: string,
  field: ContactField,
  value: string,
  create: Omit<Prisma.ContactUncheckedCreateInput, "orgId">,
  options: {
    source: ContactIdentitySource;
    channelId?: string | null;
    /** More identities to set on a contact this call creates. */
    alsoSet?: Partial<ContactFields>;
    select?: S;
  },
): Promise<{ contact: Prisma.ContactGetPayload<{ select: S }>; created: boolean }> {
  const kind = CONTACT_FIELD_KIND[field];
  const normalized = normalizeIdentityValue(kind, value);
  const select = (options.select ?? { id: true }) as S;
  const find = () =>
    prisma.contact.findFirst({
      where: { orgId, identities: { some: { kind, value: normalized } } },
      select,
    });

  const existing = await find();
  if (existing) return { contact: existing as never, created: false };

  try {
    const contact = await prisma.$transaction(async (tx) => {
      const row = await tx.contact.create({ data: { ...create, orgId }, select: { id: true } });
      await setPrimaryIdentities(
        orgId,
        row.id,
        { ...options.alsoSet, [field]: value },
        options.source,
        tx,
        { channelId: options.channelId },
      );
      return tx.contact.findUniqueOrThrow({ where: { id: row.id }, select });
    });
    return { contact: contact as never, created: true };
  } catch (err) {
    const lost =
      err instanceof IdentityTakenError ||
      (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002");
    if (!lost) throw err;
    const winner = await find();
    if (!winner) throw err;
    return { contact: winner as never, created: false };
  }
}
