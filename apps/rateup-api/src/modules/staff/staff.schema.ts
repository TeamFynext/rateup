import { z } from "zod";

/** Every list in the console pages the same way. Capped so one request cannot pull a table. */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

export const idParamSchema = z.object({ id: z.uuid() });
export type IdParam = z.infer<typeof idParamSchema>;

/** A search box's text: trimmed, and empty treated as absent. */
export const searchTextSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => value || undefined);

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function pageArgs({ page, pageSize }: { page: number; pageSize: number }) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pasted ids are matched exactly rather than by substring. */
export function asUuid(value: string | undefined): string | undefined {
  return value && UUID_RE.test(value) ? value.toLowerCase() : undefined;
}

/**
 * The digits of a phone-number search, or undefined when the text is not one. Staff paste
 * numbers in every format ("+91 98765 43210", "098765-43210"); stored numbers are digits.
 */
export function asPhoneDigits(value: string | undefined): string | undefined {
  if (!value || !/^[\d\s()+-]+$/.test(value)) return undefined;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 5 ? digits : undefined;
}
