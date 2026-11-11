import { Prisma } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { currentApiPath, LEGACY_PREFIX_PATTERNS } from "../../../routes/legacyPaths.js";

export interface AuditLogFilters {
  from?: Date;
  to?: Date;
  userId?: string;
  /** A route's feature key, e.g. `contacts` or `automation/rules` — see `auditFeatureKey`. */
  feature?: string;
}

/** Prefixes whose first segment is only a group name, so the key takes a second segment. */
const GROUP_SEGMENTS = new Set(["automation", "whatsapp"]);

/**
 * A logged route's feature: the path's first segment after `/api/`, or two under
 * `/api/automation/` and `/api/whatsapp/`. Rows written before the 2026-11-10 URL rename
 * hold old paths, which are read as their new ones, so `/api/contact/x` and
 * `/api/contacts/x` are both `contacts`.
 */
export function auditFeatureKey(route: string): string | undefined {
  const match = /^\/api\/([^/?#]+)(?:\/([^/?#]+))?/.exec(currentApiPath(route));
  if (!match) return undefined;
  const [, first, second] = match;
  return GROUP_SEGMENTS.has(first) && second ? `${first}/${second}` : first;
}

/** `base` itself, or anything under it on a segment boundary. */
function underPrefix(base: string): Prisma.AuditLogWhereInput[] {
  return [
    { route: base },
    { route: { startsWith: `${base}/` } },
    { route: { startsWith: `${base}?` } },
  ];
}

/** The literal part of an old prefix, up to its first `:param` segment. */
function literalPrefix(from: string): string {
  const index = from.indexOf("/:");
  return index === -1 ? from : from.slice(0, index);
}

/**
 * Entries carry the request path (`/api/contacts/abc?x=1`), not a feature column, so a
 * feature is a path prefix: its current one, plus each old prefix that now leads into it,
 * minus any longer old prefix under that one that moved to another feature
 * (`/api/contact` is contacts, but `/api/contact/conversations` is now inbox).
 */
function featureWhere(feature: string): Prisma.AuditLogWhereInput {
  const OR = underPrefix(`/api/${feature}`);
  const legacy = LEGACY_PREFIX_PATTERNS.map((p) => ({
    prefix: literalPrefix(p.from),
    key: auditFeatureKey(p.to),
  }));
  for (const { prefix, key } of legacy) {
    if (key !== feature) continue;
    const movedAway = legacy.filter(
      (other) => other.key !== feature && other.prefix.startsWith(`${prefix}/`),
    );
    const under = underPrefix(prefix);
    if (movedAway.length === 0) {
      OR.push(...under);
    } else {
      OR.push({
        AND: [
          { OR: under },
          ...movedAway.map((other) => ({ NOT: { OR: underPrefix(other.prefix) } })),
        ],
      });
    }
  }
  return { OR };
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
 * The SQL twin of `auditFeatureKey`: an old path is keyed by the feature its prefix now
 * leads to, a current one by its first segment (two under automation/ and whatsapp/).
 */
const featureKeySql = Prisma.sql`CASE ${Prisma.join(
  LEGACY_PREFIX_PATTERNS.map(
    (p) => Prisma.sql`WHEN route ~ ${`^${p.source}([/?#]|$)`} THEN ${auditFeatureKey(p.to)}`,
  ),
  " ",
)} ELSE substring(route from '^/api/((?:automation/|whatsapp/)?[^/?#]+)') END`;

/** The features that appear in this org's log, busiest first, for the filter's options. */
export async function listAuditLogFeatures(orgId: string) {
  const rows = await prisma.$queryRaw<{ key: string | null; count: bigint }[]>`
    SELECT ${featureKeySql} AS key, COUNT(*) AS count
    FROM "AuditLog"
    WHERE "orgId" = ${orgId}::uuid
    GROUP BY 1
    ORDER BY count DESC`;
  return rows
    .filter((row): row is { key: string; count: bigint } => Boolean(row.key))
    .map((row) => ({ key: row.key, count: Number(row.count) }));
}
