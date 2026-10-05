/**
 * Plain `validateSearch` helpers. Route options other than the component land in the client
 * entry, so a validator there must not pull in zod; keep this module import-free.
 *
 * The router JSON-parses search values, so `?page=3` arrives as a number and `?q=true` as a
 * boolean — a helper that wants a string does not get one for those.
 */

/** The value when it is a string, else `undefined`. */
export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Any present value as a string (an all-digit phone arrives as a number); `undefined` stays absent. */
export function coercedString(value: unknown): string | undefined {
  return value === undefined ? undefined : String(value);
}

/** The value when it is one of `options`, else `undefined`. */
export function oneOf<const T extends string>(
  options: readonly T[],
  value: unknown,
): T | undefined {
  return options.find((option) => option === value);
}

/** A whole number of at least 1, from a number or numeric string; `fallback` otherwise. */
export function pageNumber(value: unknown, fallback = 1): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : fallback;
}
