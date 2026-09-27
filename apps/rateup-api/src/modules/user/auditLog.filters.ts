import type { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";

export interface AuditLogFilters {
  from?: Date;
  to?: Date;
  userId?: string;
  /** A route's feature key, e.g. `contact` or `wa/inbox` — see `listAuditLogFeatures`. */
  feature?: string;
}

/**
 * Entries carry the request path (`/api/contact/abc?x=1`), not a feature column,
 * so a feature is its path prefix. Matched on a segment boundary, so `contact`
 * does not also take `contact-group`.
 */
function featureWhere(feature: string): Prisma.AuditLogWhereInput {
  const base = `/api/${feature}`;
  return {
    OR: [
      { route: base },
      { route: { startsWith: `${base}/` } },
      { route: { startsWith: `${base}?` } },
    ],
  };
}

export function auditLogWhere(orgId: string, filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = { orgId };
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from && { gte: filters.from }),
      ...(filters.to && { lte: filters.to }),
    };
  }
  if (filters.userId) where.userId = filters.userId;
  if (filters.feature) Object.assign(where, featureWhere(filters.feature));
  return where;
}

/**
 * The features that appear in this org's log, busiest first, for the filter's
 * options. The key is the path's first segment, or two under `/api/wa/`, whose
 * first segment is only the WhatsApp prefix. Mirrors `featureWhere`.
 */
export async function listAuditLogFeatures(orgId: string) {
  const rows = await prisma.$queryRaw<{ key: string | null; count: bigint }[]>`
    SELECT substring(route from '^/api/((?:wa/)?[^/?]+)') AS key, COUNT(*) AS count
    FROM "AuditLog"
    WHERE "orgId" = ${orgId}::uuid
    GROUP BY key
    ORDER BY count DESC`;
  return rows
    .filter((row): row is { key: string; count: bigint } => Boolean(row.key))
    .map((row) => ({ key: row.key, count: Number(row.count) }));
}
