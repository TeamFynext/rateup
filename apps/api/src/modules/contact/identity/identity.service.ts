import {
  ContactIdentityKind,
  ContactIdentitySource,
  PlatformType,
} from "../../../generated/prisma/enums.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { isBsuid } from "../../whatsapp/bsuid.js";
import { suggestMerge } from "../merge/suggestions.service.js";

/**
 * Contact identities: every way one person is known — phones, emails, WhatsApp BSUIDs,
 * Instagram and Messenger ids, integration ids — any number of each.
 *
 * During the expand phase the contact's legacy columns (`phone`, `email`, `bsuid`, `igsId`,
 * `psid`) stay authoritative for its *primary* identity of each kind, and every lookup tries
 * identities first and the column second. So a contact with no identity rows yet (not
 * backfilled) still matches, and a merged contact's second phone or second Instagram id —
 * which only exists here — matches too.
 *
 * Never match on a name, username or picture: only exact identifiers belong here.
 */

type Db = Prisma.TransactionClient | typeof prisma;

export interface IdentityInput {
  kind: ContactIdentityKind;
  value: string;
  /** The channel it was seen on. Becomes the scope for per-channel kinds. */
  channelId?: string | null;
  /** EXTERNAL only: the integration key ("shopify", "zoho", "external_id"). */
  integration?: string;
  source: ContactIdentitySource;
  verified?: boolean;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

/** Kinds whose values are unique per channel rather than per org. */
const CHANNEL_SCOPED: ContactIdentityKind[] = [
  ContactIdentityKind.IG_SCOPED,
  ContactIdentityKind.FB_PSID,
  ContactIdentityKind.WEBCHAT,
];

/** The legacy Contact column that mirrors the primary identity of a kind, if any. */
export const LEGACY_COLUMN: Partial<
  Record<ContactIdentityKind, "phone" | "email" | "bsuid" | "igsId" | "psid">
> = {
  [ContactIdentityKind.PHONE]: "phone",
  [ContactIdentityKind.EMAIL]: "email",
  [ContactIdentityKind.WA_BSUID]: "bsuid",
  [ContactIdentityKind.IG_SCOPED]: "igsId",
  [ContactIdentityKind.FB_PSID]: "psid",
};

/** E.164 allows at most 15 digits; Instagram and Messenger ids are 16 or more. */
const PHONE_DIGITS_RE = /^\d{7,15}$/;

/**
 * The phone number a contact's `phone` column really holds, or null. Older Instagram and
 * Messenger paths copied the platform id into `phone`, and older WhatsApp paths a BSUID, so
 * the column alone is not proof of a number anyone can message or call.
 */
export function legacyPhone(contact: {
  phone?: string | null;
  igsId?: string | null;
  psid?: string | null;
}): string | null {
  const phone = contact.phone?.trim();
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (isBsuid(phone) || phone === contact.igsId || phone === contact.psid) return null;
  return PHONE_DIGITS_RE.test(digits) ? phone : null;
}

export function normalizeIdentityValue(kind: ContactIdentityKind, value: string): string {
  const trimmed = value.trim();
  switch (kind) {
    case ContactIdentityKind.PHONE:
      return trimmed.replace(/\D/g, "");
    case ContactIdentityKind.EMAIL:
      return trimmed.toLowerCase();
    default:
      return trimmed;
  }
}

export function identityScope(input: Pick<IdentityInput, "kind" | "channelId" | "integration">) {
  if (CHANNEL_SCOPED.includes(input.kind)) return input.channelId ?? "";
  if (input.kind === ContactIdentityKind.EXTERNAL) return input.integration ?? "";
  return "";
}

/** The contact that holds an identity, whatever scope it was recorded under. */
export async function findContactIdByIdentity(
  orgId: string,
  kind: ContactIdentityKind,
  value: string | null | undefined,
  db: Db = prisma,
): Promise<string | null> {
  if (!value) return null;
  const normalized = normalizeIdentityValue(kind, value);
  if (!normalized) return null;
  const row = await db.contactIdentity.findFirst({
    where: { orgId, kind, value: normalized },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: { contactId: true },
  });
  return row?.contactId ?? null;
}

export type AttachResult =
  | { status: "attached" | "updated"; identityId: string }
  /** The identity already belongs to another contact; nothing was moved. */
  | { status: "owned_by_other"; identityId: string; ownerContactId: string };

/**
 * Records an identity on a contact. Idempotent: seeing it again only refreshes
 * `lastSeenAt`, the channel and the profile fields. An identity held by another contact
 * is never moved here — that is a merge, and a merge is a person's decision (or a proven
 * handoff), so the caller gets `owned_by_other` back.
 */
export async function attachIdentity(
  orgId: string,
  contactId: string,
  input: IdentityInput,
  db: Db = prisma,
): Promise<AttachResult | null> {
  const value = normalizeIdentityValue(input.kind, input.value);
  if (!value) return null;
  // Never a PHONE that cannot be one (a platform id that reached a phone field).
  if (input.kind === ContactIdentityKind.PHONE && !PHONE_DIGITS_RE.test(value)) return null;
  const scope = identityScope(input);
  const profile = {
    ...(input.username ? { username: input.username } : {}),
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    ...(input.channelId ? { channelId: input.channelId } : {}),
    lastSeenAt: new Date(),
  };

  const existing = await db.contactIdentity.findMany({
    where: { orgId, kind: input.kind, value },
    select: { id: true, contactId: true, scope: true, verified: true },
  });
  const same =
    existing.find((row) => row.scope === scope) ??
    existing.find((row) => !row.scope) ??
    // No channel given (a legacy column, a merge): the id recorded under its channel is the
    // same identity, not a second one. The contact's own row first.
    (scope ? undefined : (existing.find((row) => row.contactId === contactId) ?? existing[0]));
  if (same) {
    if (same.contactId !== contactId) {
      return { status: "owned_by_other", identityId: same.id, ownerContactId: same.contactId };
    }
    await db.contactIdentity.update({
      where: { id: same.id },
      data: {
        ...profile,
        // A per-channel id recorded before its channel was known takes the channel now.
        ...(!same.scope && scope ? { scope } : {}),
        ...(input.verified && !same.verified ? { verified: true } : {}),
      },
    });
    return { status: "updated", identityId: same.id };
  }

  const hasPrimary = await db.contactIdentity.count({
    where: { contactId, kind: input.kind, isPrimary: true },
  });
  try {
    const row = await db.contactIdentity.create({
      data: {
        orgId,
        contactId,
        kind: input.kind,
        scope,
        value,
        source: input.source,
        verified: input.verified ?? false,
        isPrimary: hasPrimary === 0,
        ...profile,
      },
      select: { id: true },
    });
    return { status: "attached", identityId: row.id };
  } catch (e) {
    // Written by a concurrent message a moment ago: read it back.
    if ((e as { code?: string })?.code === "P2002") {
      const row = await db.contactIdentity.findUnique({
        where: { orgId_kind_scope_value: { orgId, kind: input.kind, scope, value } },
        select: { id: true, contactId: true },
      });
      if (row && row.contactId !== contactId) {
        return { status: "owned_by_other", identityId: row.id, ownerContactId: row.contactId };
      }
      if (row) return { status: "updated", identityId: row.id };
    }
    throw e;
  }
}

/** What a contact's legacy columns say about its identities (for the backfill and sync). */
export function identitiesFromContact(contact: {
  phone?: string | null;
  email?: string | null;
  bsuid?: string | null;
  igsId?: string | null;
  psid?: string | null;
  external_id?: string | null;
  whatsappUserName?: string | null;
}): IdentityInput[] {
  const out: IdentityInput[] = [];
  const source = ContactIdentitySource.IMPORT;
  const phone = legacyPhone(contact);
  if (phone) out.push({ kind: ContactIdentityKind.PHONE, value: phone, source });
  if (contact.email) out.push({ kind: ContactIdentityKind.EMAIL, value: contact.email, source });
  const bsuid = contact.bsuid ?? (contact.phone && isBsuid(contact.phone) ? contact.phone : null);
  if (bsuid) {
    out.push({
      kind: ContactIdentityKind.WA_BSUID,
      value: bsuid,
      source,
      verified: true,
      username: contact.whatsappUserName,
    });
  }
  if (contact.igsId) {
    out.push({ kind: ContactIdentityKind.IG_SCOPED, value: contact.igsId, source, verified: true });
  }
  if (contact.psid) {
    out.push({ kind: ContactIdentityKind.FB_PSID, value: contact.psid, source, verified: true });
  }
  if (contact.external_id) {
    out.push({
      kind: ContactIdentityKind.EXTERNAL,
      value: contact.external_id,
      integration: "external_id",
      source,
    });
  }
  return out;
}

/**
 * Records the identities one message showed us: the sender's platform id on the channel
 * it came in on, plus a WhatsApp phone/BSUID pair. Called for every stored message, so it
 * is what keeps identities current during the expand phase. An identity another contact
 * already holds raises a merge suggestion instead of moving it.
 *
 * Never throws: identities must not cost a customer's message.
 */
export async function recordMessageIdentities(
  orgId: string,
  contactId: string,
  seen: {
    platform: PlatformType;
    channelId: string | null;
    from: string;
    phone?: string;
    bsuid?: string;
    username?: string | null;
    displayName?: string | null;
  },
): Promise<void> {
  const inputs: IdentityInput[] = [];
  const base = {
    channelId: seen.channelId,
    source: ContactIdentitySource.INBOUND,
    verified: true,
    displayName: seen.displayName,
  };
  switch (seen.platform) {
    case PlatformType.WHATSAPP:
      if (seen.phone && !isBsuid(seen.phone)) {
        inputs.push({ ...base, kind: ContactIdentityKind.PHONE, value: seen.phone });
      }
      if (seen.bsuid) {
        inputs.push({
          ...base,
          kind: ContactIdentityKind.WA_BSUID,
          value: seen.bsuid,
          username: seen.username,
        });
      }
      break;
    case PlatformType.INSTAGRAM:
      inputs.push({
        ...base,
        kind: ContactIdentityKind.IG_SCOPED,
        value: seen.from,
        username: seen.username,
      });
      break;
    case PlatformType.FACEBOOK:
      inputs.push({ ...base, kind: ContactIdentityKind.FB_PSID, value: seen.from });
      break;
    case PlatformType.WEBCHAT:
      inputs.push({
        ...base,
        kind: ContactIdentityKind.WEBCHAT,
        value: seen.from,
        verified: false,
      });
      break;
    default:
      return;
  }
  for (const input of inputs) {
    try {
      const result = await attachIdentity(orgId, contactId, input);
      if (result?.status === "owned_by_other") {
        await suggestMerge(orgId, contactId, result.ownerContactId, {
          reason: input.kind === ContactIdentityKind.WA_BSUID ? "BSUID_PHONE_SPLIT" : "SAME_PHONE",
          detail: input.value,
        });
      }
    } catch (err) {
      log.warn({ err, orgId, contactId, kind: input.kind }, "Could not record contact identity");
    }
  }
}

/** Every identity of a contact, primaries first, with the channel and its business. */
export async function listContactIdentities(orgId: string, contactId: string) {
  const rows = await prisma.contactIdentity.findMany({
    where: { orgId, contactId },
    orderBy: [{ kind: "asc" }, { isPrimary: "desc" }, { createdAt: "asc" }],
    include: {
      channel: {
        select: {
          id: true,
          platform: true,
          name: true,
          username: true,
          address: true,
          whatsapp: { select: { businessPortfolioId: true, businessPortfolioName: true } },
        },
      },
    },
  });
  // A channel-less copy of an id the contact also holds under its channel (left by merges
  // before the backfill cleanup) is the same identity; showing it twice reads as a stranger.
  const scoped = new Set(rows.filter((row) => row.scope).map((row) => `${row.kind}:${row.value}`));
  return rows.filter(
    (row) =>
      row.scope || !CHANNEL_SCOPED.includes(row.kind) || !scoped.has(`${row.kind}:${row.value}`),
  );
}

/**
 * Keeps a contact's legacy column in step with its primary identity of one kind. Used by
 * merge and identity removal; the old readers keep working off the column.
 */
export async function syncLegacyColumn(
  contactId: string,
  kind: ContactIdentityKind,
  db: Db = prisma,
): Promise<void> {
  const column = LEGACY_COLUMN[kind];
  if (!column) return;
  const primary = await db.contactIdentity.findFirst({
    where: { contactId, kind },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: { id: true, value: true, isPrimary: true },
  });
  if (primary && !primary.isPrimary) {
    await db.contactIdentity.update({ where: { id: primary.id }, data: { isPrimary: true } });
  }
  await db.contact.update({
    where: { id: contactId },
    data: { [column]: primary?.value ?? null },
  });
}

/**
 * A phone or email a staff member adds to a contact. Held by another contact → nothing is
 * moved; the caller gets that contact back and a merge suggestion is raised.
 */
export async function addManualIdentity(
  orgId: string,
  contactId: string,
  input: { kind: ContactIdentityKind; value: string },
) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, orgId },
    select: { id: true },
  });
  if (!contact) return { status: "not_found" as const };
  const value = normalizeIdentityValue(input.kind, input.value);
  if (input.kind === ContactIdentityKind.PHONE && !PHONE_DIGITS_RE.test(value)) {
    return { status: "invalid" as const };
  }
  if (input.kind === ContactIdentityKind.EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { status: "invalid" as const };
  }
  // Someone holding it only in the legacy column (not backfilled) counts as holding it.
  const column = LEGACY_COLUMN[input.kind];
  const holder =
    (await findContactIdByIdentity(orgId, input.kind, value)) ??
    (column
      ? (
          await prisma.contact.findFirst({
            where: { orgId, [column]: value, id: { not: contactId } },
            select: { id: true },
          })
        )?.id
      : null);
  if (holder && holder !== contactId) {
    await suggestMerge(orgId, contactId, holder, {
      reason: input.kind === ContactIdentityKind.EMAIL ? "SAME_EMAIL" : "SAME_PHONE",
      detail: value,
    });
    return { status: "owned_by_other" as const, ownerContactId: holder };
  }
  const result = await attachIdentity(orgId, contactId, {
    kind: input.kind,
    value,
    source: ContactIdentitySource.AGENT,
  });
  if (result?.status === "owned_by_other") {
    return { status: "owned_by_other" as const, ownerContactId: result.ownerContactId };
  }
  await syncLegacyColumn(contactId, input.kind);
  return { status: "ok" as const, identityId: result?.identityId };
}

/**
 * Changes a phone or email a contact is known by — a typo fixed, a new number — and/or makes
 * it the contact's main one of its kind, which is what the contact's phone/email column (and
 * so every older reader) shows. Platform ids (BSUID, Instagram, Messenger) are what the
 * platform told us and are never edited by hand.
 */
export async function updateManualIdentity(
  orgId: string,
  contactId: string,
  identityId: string,
  input: { value?: string; isPrimary?: true },
) {
  const identity = await prisma.contactIdentity.findFirst({
    where: { id: identityId, contactId, orgId },
  });
  if (!identity) return { status: "not_found" as const };
  if (identity.kind !== ContactIdentityKind.PHONE && identity.kind !== ContactIdentityKind.EMAIL) {
    return { status: "not_editable" as const };
  }
  const value =
    input.value === undefined ? identity.value : normalizeIdentityValue(identity.kind, input.value);
  if (identity.kind === ContactIdentityKind.PHONE && !PHONE_DIGITS_RE.test(value)) {
    return { status: "invalid" as const };
  }
  if (identity.kind === ContactIdentityKind.EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { status: "invalid" as const };
  }
  if (value !== identity.value) {
    const column = LEGACY_COLUMN[identity.kind];
    const holder =
      (await findContactIdByIdentity(orgId, identity.kind, value)) ??
      (column
        ? (
            await prisma.contact.findFirst({
              where: { orgId, [column]: value, id: { not: contactId } },
              select: { id: true },
            })
          )?.id
        : null);
    if (holder && holder !== contactId) {
      await suggestMerge(orgId, contactId, holder, {
        reason: identity.kind === ContactIdentityKind.EMAIL ? "SAME_EMAIL" : "SAME_PHONE",
        detail: value,
      });
      return { status: "owned_by_other" as const, ownerContactId: holder };
    }
    // The contact already has that value as another identity: this one is simply a duplicate.
    if (holder === contactId) return { status: "duplicate" as const };
  }
  await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.contactIdentity.updateMany({
        where: { contactId, kind: identity.kind, isPrimary: true, id: { not: identity.id } },
        data: { isPrimary: false },
      });
    }
    await tx.contactIdentity.update({
      where: { id: identity.id },
      data: {
        value,
        ...(input.isPrimary ? { isPrimary: true } : {}),
        // A hand-corrected value is no longer what the platform verified.
        ...(value !== identity.value
          ? { verified: false, source: ContactIdentitySource.AGENT }
          : {}),
      },
    });
    await syncLegacyColumn(contactId, identity.kind, tx);
  });
  return { status: "ok" as const };
}

/**
 * A customer typed a phone or email (the webchat widget's form, a Journey question) that
 * another contact is already known by. Typed is not proven — anyone can enter anyone's
 * number on a public website — so this never merges: it raises a CUSTOMER_PROVIDED
 * suggestion for a person to review. Never throws.
 */
export async function suggestFromProvidedDetails(
  orgId: string,
  contactId: string,
  provided: { phone?: string | null; email?: string | null },
): Promise<void> {
  const candidates: { kind: ContactIdentityKind; value: string }[] = [];
  const phone = provided.phone
    ? normalizeIdentityValue(ContactIdentityKind.PHONE, provided.phone)
    : "";
  if (PHONE_DIGITS_RE.test(phone))
    candidates.push({ kind: ContactIdentityKind.PHONE, value: phone });
  const email = provided.email
    ? normalizeIdentityValue(ContactIdentityKind.EMAIL, provided.email)
    : "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    candidates.push({ kind: ContactIdentityKind.EMAIL, value: email });
  }
  for (const candidate of candidates) {
    try {
      const column = LEGACY_COLUMN[candidate.kind];
      const owner =
        (await findContactIdByIdentity(orgId, candidate.kind, candidate.value)) ??
        (column
          ? (
              await prisma.contact.findFirst({
                where: { orgId, [column]: candidate.value, id: { not: contactId } },
                select: { id: true },
              })
            )?.id
          : null);
      if (owner && owner !== contactId) {
        await suggestMerge(orgId, contactId, owner, {
          reason: "CUSTOMER_PROVIDED",
          detail: candidate.value,
        });
      }
    } catch (err) {
      log.warn({ err, contactId }, "Could not check customer-provided details for duplicates");
    }
  }
}

/** Removes one identity. A contact keeps at least one, or nothing could reach it. */
export async function removeIdentity(orgId: string, contactId: string, identityId: string) {
  const identity = await prisma.contactIdentity.findFirst({
    where: { id: identityId, contactId, orgId },
  });
  if (!identity) return { status: "not_found" as const };
  const remaining = await prisma.contactIdentity.count({ where: { contactId } });
  if (remaining <= 1) return { status: "last_identity" as const };
  await prisma.contactIdentity.delete({ where: { id: identity.id } });
  await syncLegacyColumn(contactId, identity.kind);
  return { status: "ok" as const };
}

/** A phone or email being saved on a contact that another contact is already known by. */
export class IdentityTakenError extends Error {
  constructor(
    readonly kind: ContactIdentityKind,
    readonly value: string,
    readonly ownerContactId: string,
  ) {
    super(
      `Another contact already has this ${kind === ContactIdentityKind.EMAIL ? "email" : "phone"}`,
    );
    this.name = "IdentityTakenError";
  }
}

/** The identity kinds a contact's edit form writes straight into a column. */
export const EDITABLE_COLUMN_KINDS = {
  phone: ContactIdentityKind.PHONE,
  email: ContactIdentityKind.EMAIL,
  external_id: ContactIdentityKind.EXTERNAL,
} as const;
export type EditableColumn = keyof typeof EDITABLE_COLUMN_KINDS;

/**
 * Refuses a phone or email another contact is known by. The column's own unique index
 * only sees other contacts' columns; a merged contact's second number lives only in its
 * identities.
 */
export async function assertIdentityFree(
  orgId: string,
  contactId: string,
  kind: ContactIdentityKind,
  value: string | null | undefined,
): Promise<void> {
  if (!value || kind === ContactIdentityKind.EXTERNAL) return;
  const owner = await findContactIdByIdentity(orgId, kind, value);
  if (owner && owner !== contactId) {
    throw new IdentityTakenError(kind, normalizeIdentityValue(kind, value), owner);
  }
}

/**
 * After an edit changed a contact's phone, email or external id column: the identity the
 * old value stood for goes, and the new value becomes the primary identity of its kind.
 * Other identities of that kind (a merged second number) are left alone. Never throws —
 * the edit itself has already been saved.
 */
export async function replaceColumnIdentity(
  orgId: string,
  contactId: string,
  column: EditableColumn,
  oldValue: string | null | undefined,
  newValue: string | null | undefined,
): Promise<void> {
  const kind = EDITABLE_COLUMN_KINDS[column];
  const scope = kind === ContactIdentityKind.EXTERNAL ? "external_id" : "";
  const before = oldValue ? normalizeIdentityValue(kind, oldValue) : "";
  const after = newValue ? normalizeIdentityValue(kind, newValue) : "";
  if (before === after) return;
  try {
    if (before) {
      await prisma.contactIdentity.deleteMany({
        where: { orgId, contactId, kind, scope, value: before },
      });
    }
    if (!after) return;
    const result = await attachIdentity(orgId, contactId, {
      kind,
      value: after,
      source: ContactIdentitySource.AGENT,
      ...(kind === ContactIdentityKind.EXTERNAL ? { integration: "external_id" } : {}),
    });
    if (!result || result.status === "owned_by_other") return;
    await prisma.$transaction([
      prisma.contactIdentity.updateMany({
        where: { contactId, kind, isPrimary: true, id: { not: result.identityId } },
        data: { isPrimary: false },
      }),
      prisma.contactIdentity.update({
        where: { id: result.identityId },
        data: { isPrimary: true },
      }),
    ]);
  } catch (err) {
    log.warn({ err, contactId, column }, "Could not update the contact's identity after an edit");
  }
}
