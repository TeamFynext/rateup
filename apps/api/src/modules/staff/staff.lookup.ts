import { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";

/**
 * Channels whose number or WABA id contains these digits. Stored numbers keep whatever
 * formatting they arrived with ("+1555-132-3034"), so the comparison strips both sides to
 * digits; Prisma's `contains` cannot, hence the raw query.
 */
export async function channelsMatchingDigits(
  digits: string,
  limit: number,
): Promise<{ id: string; orgId: string }[]> {
  const pattern = `%${digits}%`;
  return prisma.$queryRaw<{ id: string; orgId: string }[]>`
    SELECT id, "orgId"
    FROM "WhatsappSettings"
    WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE ${pattern}
       OR "wabaId" LIKE ${pattern}
    LIMIT ${limit}`;
}

/** Users whose own phone number contains these digits, formatting ignored. */
export async function usersMatchingDigits(digits: string, limit: number): Promise<string[]> {
  const pattern = `%${digits}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User"
    WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE ${pattern}
    LIMIT ${limit}`;
  return rows.map((row) => row.id);
}

/**
 * When each org was last used: the newest customer audit row. Asked only for the orgs on
 * the page, one grouped query, so the list never scans the audit table for every org.
 */
export async function lastActiveByOrg(orgIds: string[]): Promise<Map<string, Date>> {
  if (orgIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ orgId: string; last: Date }[]>`
    SELECT "orgId", MAX("createdAt") AS last
    FROM "AuditLog"
    WHERE "orgId" IN (${Prisma.join(orgIds.map((id) => Prisma.sql`${id}::uuid`))})
    GROUP BY "orgId"`;
  return new Map(rows.map((row) => [row.orgId, row.last]));
}
