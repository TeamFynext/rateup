import { Prisma } from "../../../../generated/prisma/client.js";
import type { ListLeadsQuerySchema } from "./lead.schema.js";

/**
 * The board's filters, as SQL.
 *
 * Every fragment here assumes two aliases are in scope: `l` for `Lead` and `s`
 * for the `PipelineStage` it sits on (`JOIN "PipelineStage" s ON s.id =
 * l."stageId"`). The stage is needed for the rotting window, which lives on the
 * column rather than the lead.
 *
 * These used to run in the browser over every lead on the board. They moved here
 * so a page of fifty cards and a count over a hundred thousand answer the same
 * question — see `filterLeads` in
 * `rateup-ui/src/components/pipeline/pipeline.utils.ts`, which this replaces.
 */

/** `%`, `_` and the escape itself are literal in a user's search term. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/**
 * A lead is rotting when the board has the check on, the lead is still open, its
 * column sets a window, and nothing has touched it inside that window.
 *
 * Mirrors `isRotting()` in `rateup-ui/src/components/pipeline/pipeline.utils.ts`
 * — the card badge is drawn there, the counts are computed here, and the two
 * have to agree. Keep both in step.
 *
 * Dates are subtracted rather than intervals compared: the UI measures idleness
 * in whole days from the start of the day (`daysSince`), so `lastActivityAt`
 * earlier today is 0 days idle in both places.
 */
export function rottingSql(rottingEnabled: boolean): Prisma.Sql {
  if (!rottingEnabled) return Prisma.sql`false`;
  return Prisma.sql`(
    l.status = 'OPEN'::"LeadStatus"
    AND s."rottingDays" > 0
    AND (CURRENT_DATE - l."lastActivityAt"::date) > s."rottingDays"
  )`;
}

/** The saved views in the sidebar. */
function filterSql(
  filter: ListLeadsQuerySchema["filter"],
  ctx: { userId: string; rottingEnabled: boolean },
): Prisma.Sql | null {
  switch (filter) {
    // "All leads on board" means all of them, won and lost included. Hiding the
    // closed ones made the Lost column read as empty under the default view.
    case "open":
      return null;
    case "mine":
      return Prisma.sql`(
        l.status = 'OPEN'::"LeadStatus"
        AND EXISTS (
          SELECT 1 FROM "LeadAssignee" a
          WHERE a."leadId" = l.id AND a."assigneeId" = ${ctx.userId}::uuid
        )
      )`;
    case "rotting":
      return rottingSql(ctx.rottingEnabled);
    case "noactivity":
      return Prisma.sql`(
        l.status = 'OPEN'::"LeadStatus"
        AND NOT EXISTS (
          SELECT 1 FROM "LeadTask" t WHERE t."leadId" = l.id AND t."completedAt" IS NULL
        )
      )`;
    case "won":
      return Prisma.sql`l.status = 'WON'::"LeadStatus"`;
    case "lost":
      return Prisma.sql`l.status = 'LOST'::"LeadStatus"`;
  }
}

/**
 * The whole `WHERE` clause for a lead read, board scope included.
 *
 * Returned as one `Prisma.Sql` so callers interpolate it into a template rather
 * than assembling strings — every value the client sent stays a bound parameter.
 */
export function leadWhere(
  query: ListLeadsQuerySchema,
  ctx: { userId: string; rottingEnabled: boolean },
): Prisma.Sql {
  const clauses: Prisma.Sql[] = [Prisma.sql`l."pipelineId" = ${query.pipelineId}::uuid`];

  const view = filterSql(query.filter, ctx);
  if (view) clauses.push(view);

  if (query.stageId) clauses.push(Prisma.sql`l."stageId" = ${query.stageId}::uuid`);
  if (query.teamId) clauses.push(Prisma.sql`l."teamId" = ${query.teamId}::uuid`);
  if (query.source) clauses.push(Prisma.sql`l.source = ${query.source}::"LeadSource"`);

  if (query.assigneeId) {
    clauses.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "LeadAssignee" a
      WHERE a."leadId" = l.id AND a."assigneeId" = ${query.assigneeId}::uuid
    )`);
  }

  // Name, company and phone — the same shape the inbox searches contacts with
  // (see the `isSearchMode` block in wamessage.service.ts): a plain
  // `ILIKE '%term%'` over the text columns, and the phone compared with spaces
  // stripped from both sides so "98 76" still finds "9876".
  //
  // A contains-match cannot use a B-tree, so this is a sequential scan — a
  // deliberate choice at this size. Measured over 10k leads it costs ~5.6ms per
  // column, and the board runs one query per column. Indexing it would mean a
  // `pg_trgm` GIN index: an extension to install on every database, an index
  // typically larger than the column it covers, and a write cost on every lead.
  // Worth it in the hundreds of thousands of leads; not worth it here.
  //
  // Each column is matched on its own rather than against all three
  // concatenated. That is the more predictable rule: the concatenated form let
  // a search for "jane smith" match a lead named Jane at a company called Smith
  // Ltd, which reads as a false positive rather than as a feature.
  if (query.search) {
    const term = `%${escapeLike(query.search)}%`;
    // A lead's phone is stored without its `+` (the add-lead dialog strips it),
    // so a number pasted in full still has to match.
    const digits = `%${escapeLike(query.search.replace(/\s+/g, "").replace(/^\+/, ""))}%`;
    clauses.push(Prisma.sql`(
      l.name ILIKE ${term} ESCAPE '\\'
      OR l.company ILIKE ${term} ESCAPE '\\'
      OR REPLACE(l.phone, ' ', '') LIKE ${digits} ESCAPE '\\'
    )`);
  }

  return Prisma.join(clauses, " AND ");
}
