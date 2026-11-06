import z from "zod";

import { ExternalApiError } from "../shared/errors.js";

/**
 * One way to page through any list on the partner API.
 *
 * Keyset on `(createdAt, id)`, newest first, so a page is an index range scan however deep
 * the caller goes and rows inserted while paging neither repeat nor go missing. The cursor
 * is opaque on purpose: callers pass back what they were given and never build one.
 */

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().max(200).optional().describe("`nextCursor` from the previous page"),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    nextCursor: z
      .string()
      .nullable()
      .describe("Pass as `cursor` for the next page; null at the end"),
  });
}

export interface Cursor {
  createdAt: Date;
  id: string;
}

export function encodeCursor({ createdAt, id }: Cursor): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  const [iso, id] = Buffer.from(raw, "base64url").toString("utf8").split("|");
  const createdAt = new Date(iso ?? "");
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new ExternalApiError(400, "cursor_invalid", "That cursor is not one this API issued");
  }
  return { createdAt, id };
}

/** The Prisma `where` fragment for "after this cursor", newest first. */
export function cursorWhere(cursor: Cursor | null) {
  if (!cursor) return {};
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}

export const cursorOrderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];

/**
 * Callers fetch `limit + 1` rows; the extra one only says whether another page exists.
 */
export function toPage<R extends Cursor, T>(
  rows: R[],
  limit: number,
  present: (row: R) => T,
): { data: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  return {
    data: page.map(present),
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  };
}
