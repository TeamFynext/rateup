export function getNestedProperty<T = unknown>(sourceObject: object, path: string): T | undefined {
  const result = path
    .split(".")
    .reduce<unknown>(
      (obj, key) =>
        obj && typeof obj === "object" && (obj as Record<string, unknown>)[key] !== undefined
          ? (obj as Record<string, unknown>)[key]
          : undefined,
      sourceObject,
    );
  return result as T | undefined;
}
