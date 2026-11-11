import { z } from "zod";

/**
 * Keyset cursors for the board's columns.
 *
 * A column pages on `(stageEnteredAt, id)` rather than an OFFSET: leads are
 * created and dragged between columns while somebody is scrolling, and an
 * offset shifts under them — the same card arrives twice, or a card is skipped.
 * A keyset names the last row seen, so the next page is whatever sorts after it
 * no matter what happened in between.
 *
 * `id` is part of the key because `stageEnteredAt` is not unique: a bulk move
 * stamps a whole selection with the same timestamp, and without the tiebreak
 * rows at a page boundary can be dropped.
 */
const cursorSchema = z.object({ t: z.iso.datetime(), id: z.uuid() });

export type LeadCursor = z.infer<typeof cursorSchema>;

export function encodeLeadCursor(row: { stageEnteredAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify({ t: row.stageEnteredAt.toISOString(), id: row.id })).toString(
    "base64url",
  );
}

/**
 * `undefined` for no cursor, `null` for one that could not be read.
 *
 * The two are different answers: the first is the first page, the second is a
 * client sending something this server did not mint, which the handler turns
 * into a 400 rather than letting a malformed cursor reach SQL as a 500.
 */
export function decodeLeadCursor(raw: string | undefined): LeadCursor | null | undefined {
  if (raw === undefined) return undefined;
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}
