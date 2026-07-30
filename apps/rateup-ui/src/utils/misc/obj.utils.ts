/**
 * Reads a dotted path off an object, returning `undefined` as soon as the walk
 * leaves an object. Callers that know the shape at the end of the path can
 * supply it as `T`; it defaults to `unknown`.
 */
export function getNestedProperty<T = unknown>(sourceObject: object, path: string): T | undefined {
  const value = path
    .split(".")
    .reduce<unknown>(
      (obj, key) =>
        obj !== null && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined,
      sourceObject,
    );

  // The path is dynamic, so the caller's `T` is the only shape information we
  // have; this is the single unchecked step of the lookup.
  return value as T | undefined;
}
