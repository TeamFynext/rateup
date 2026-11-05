import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";

/**
 * "These two contacts are probably one person" — raised only from strong signals (the same
 * phone, email or WhatsApp identity turning up on both), never from a similar name or
 * picture. A person decides; nothing here merges.
 */

export type SuggestionReason =
  | "SAME_PHONE"
  | "SAME_EMAIL"
  | "BSUID_PHONE_SPLIT"
  | "CUSTOMER_PROVIDED";

export const SUGGESTION_STATUS = {
  PENDING: "PENDING",
  MERGED: "MERGED",
  DISMISSED: "DISMISSED",
} as const;

/** Pairs are stored ordered so one pair is one row whichever side raised it. */
export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Raises a suggestion for a pair. A pair someone already dismissed stays dismissed — the
 * same signal will keep turning up and must not nag. Never throws.
 */
export async function suggestMerge(
  orgId: string,
  contactId: string,
  otherContactId: string,
  { reason, detail }: { reason: SuggestionReason; detail?: string },
): Promise<void> {
  if (contactId === otherContactId) return;
  const [contactAId, contactBId] = orderedPair(contactId, otherContactId);
  try {
    await prisma.contactMergeSuggestion.upsert({
      where: { orgId_contactAId_contactBId: { orgId, contactAId, contactBId } },
      create: { orgId, contactAId, contactBId, reason, detail },
      update: {},
    });
  } catch (err) {
    log.warn({ err, orgId, contactId, otherContactId }, "Could not record merge suggestion");
  }
}

/**
 * An email shared by more contacts than this is a placeholder ("test@test.com",
 * "noemail@shop.com"), not one person, so it raises nothing.
 */
const MAX_SHARED_EMAIL_GROUP = 5;

/**
 * Looks through existing contacts for likely duplicates and raises suggestions for them —
 * the live triggers (a message, an edit, a webchat visitor) only catch what happens from
 * now on. Two signals, both strong:
 *
 * - the same email on different contacts (the email column is not unique);
 * - a webchat visitor whose typed id or email is another contact's phone or email
 *   (typed, so only ever a suggestion).
 *
 * Never merges. Already-dismissed pairs stay dismissed. `orgId` null scans every org.
 */
export async function scanForDuplicates(orgId: string | null): Promise<{ pairs: number }> {
  const orgFilter = (column: string) =>
    orgId ? Prisma.sql`AND ${Prisma.raw(column)} = ${orgId}::uuid` : Prisma.empty;

  const emailGroups = await prisma.$queryRaw<{ orgId: string; email: string; ids: string[] }[]>`
    WITH emails AS (
      SELECT c."orgId", c.id, lower(trim(c.email)) AS email
      FROM "Contact" c
      WHERE c.email IS NOT NULL AND trim(c.email) <> '' ${orgFilter('c."orgId"')}
      UNION
      SELECT i."orgId", i."contactId", i.value
      FROM "ContactIdentity" i
      WHERE i.kind = 'EMAIL' ${orgFilter('i."orgId"')}
    )
    SELECT "orgId", email, array_agg(DISTINCT id ORDER BY id)::text[] AS ids
    FROM emails
    GROUP BY "orgId", email
    HAVING count(DISTINCT id) BETWEEN 2 AND ${MAX_SHARED_EMAIL_GROUP}
  `;

  const webchatMatches = await prisma.$queryRaw<
    { orgId: string; webchatId: string; otherId: string; detail: string }[]
  >`
    WITH given AS (
      SELECT w."orgId", w.id, trim(v) AS raw
      FROM "Contact" w
      CROSS JOIN LATERAL unnest(ARRAY[w.other, w.email]) AS v
      WHERE w.source = 'WEBCHAT' AND v IS NOT NULL AND trim(v) <> '' ${orgFilter('w."orgId"')}
    ), typed AS (
      SELECT "orgId", id,
        CASE WHEN raw LIKE '%@%' THEN 'EMAIL' ELSE 'PHONE' END AS kind,
        CASE WHEN raw LIKE '%@%' THEN lower(raw) ELSE regexp_replace(raw, '[^0-9]', '', 'g') END AS value
      FROM given
    )
    SELECT DISTINCT t."orgId", t.id AS "webchatId", o.id AS "otherId", t.value AS detail
    FROM typed t
    JOIN LATERAL (
      SELECT c.id FROM "Contact" c
      WHERE c."orgId" = t."orgId" AND c.id <> t.id
        AND ((t.kind = 'PHONE' AND c.phone = t.value) OR (t.kind = 'EMAIL' AND lower(c.email) = t.value))
      UNION
      SELECT i."contactId" FROM "ContactIdentity" i
      WHERE i."orgId" = t."orgId" AND i."contactId" <> t.id AND i.kind::text = t.kind AND i.value = t.value
    ) o ON TRUE
    WHERE (t.kind = 'EMAIL' AND t.value ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')
       OR (t.kind = 'PHONE' AND length(t.value) BETWEEN 7 AND 15)
  `;

  let pairs = 0;
  for (const group of emailGroups) {
    for (let i = 0; i < group.ids.length; i++) {
      for (let j = i + 1; j < group.ids.length; j++) {
        await suggestMerge(group.orgId, group.ids[i], group.ids[j], {
          reason: "SAME_EMAIL",
          detail: group.email,
        });
        pairs++;
      }
    }
  }
  for (const match of webchatMatches) {
    await suggestMerge(match.orgId, match.webchatId, match.otherId, {
      reason: "CUSTOMER_PROVIDED",
      detail: match.detail,
    });
    pairs++;
  }
  return { pairs };
}

export async function listMergeSuggestions(
  orgId: string,
  {
    status = SUGGESTION_STATUS.PENDING,
    cursor,
    limit = 25,
  }: {
    status?: string;
    cursor?: string;
    limit?: number;
  },
) {
  const rows = await prisma.contactMergeSuggestion.findMany({
    where: { orgId, status },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, limit);
  const ids = page.flatMap((row) => [row.contactAId, row.contactBId]);
  const contacts = await prisma.contact.findMany({
    where: { orgId, id: { in: ids } },
    select: CONTACT_CARD_SELECT,
  });
  const byId = new Map(contacts.map((contact) => [contact.id, contact]));
  return {
    items: page
      .map((row) => ({
        id: row.id,
        reason: row.reason,
        detail: row.detail,
        status: row.status,
        createdAt: row.createdAt,
        contactA: byId.get(row.contactAId) ?? null,
        contactB: byId.get(row.contactBId) ?? null,
      }))
      // A side deleted since (merged elsewhere, or removed) leaves nothing to decide.
      .filter((row) => row.contactA && row.contactB),
    nextCursor: rows.length > limit ? page[page.length - 1]?.id : null,
  };
}

export async function countPendingSuggestions(orgId: string) {
  return prisma.contactMergeSuggestion.count({
    where: { orgId, status: SUGGESTION_STATUS.PENDING },
  });
}

/** The pending suggestions a contact is part of — the inbox panel's "possible duplicate". */
export async function suggestionsForContact(orgId: string, contactId: string) {
  const rows = await prisma.contactMergeSuggestion.findMany({
    where: {
      orgId,
      status: SUGGESTION_STATUS.PENDING,
      OR: [{ contactAId: contactId }, { contactBId: contactId }],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const otherIds = rows.map((row) =>
    row.contactAId === contactId ? row.contactBId : row.contactAId,
  );
  const others = await prisma.contact.findMany({
    where: { orgId, id: { in: otherIds } },
    select: CONTACT_CARD_SELECT,
  });
  const byId = new Map(others.map((contact) => [contact.id, contact]));
  return rows
    .map((row) => {
      const otherId = row.contactAId === contactId ? row.contactBId : row.contactAId;
      return { id: row.id, reason: row.reason, detail: row.detail, contact: byId.get(otherId) };
    })
    .filter((row) => row.contact);
}

export async function dismissSuggestion(orgId: string, id: string, userId: string | null) {
  const result = await prisma.contactMergeSuggestion.updateMany({
    where: { id, orgId, status: SUGGESTION_STATUS.PENDING },
    data: { status: SUGGESTION_STATUS.DISMISSED, resolvedBy: userId, resolvedAt: new Date() },
  });
  return result.count > 0;
}

/** What a contact looks like on a suggestion card and in the merge search. */
export const CONTACT_CARD_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  bsuid: true,
  igsId: true,
  psid: true,
  whatsappUserName: true,
  profilePic: true,
  createdAt: true,
  lastReceivedMessageTimeStamp: true,
  /** Where the contact came from (`WEBCHAT`, `whatsapp`, an import…) and its webchat id. */
  source: true,
  other: true,
  lastMessagePlatform: true,
  /** Every phone, email and account it is known by, so two cards can be compared. */
  identities: {
    orderBy: [{ kind: "asc" }, { isPrimary: "desc" }, { createdAt: "asc" }],
    take: 12,
    select: {
      kind: true,
      value: true,
      username: true,
      displayName: true,
      channel: { select: { platform: true } },
    },
  },
} satisfies Prisma.ContactSelect;
