import type { TFunction } from "i18next";

/** A translate function as plain helpers take it, so a test can pass a simple stub. */
export type Translate = (key: string, values?: Record<string, unknown>) => string;

/**
 * i18next's `t` as a `Translate`. Since i18next 27 its type no longer takes an untyped
 * options bag, so it is not assignable to `Translate` as is; at runtime it is the same call.
 */
export function plainT(t: TFunction<any, any>): Translate {
  const call = t as unknown as (key: string, values?: Record<string, unknown>) => string;
  return (key, values) => call(key, values);
}
