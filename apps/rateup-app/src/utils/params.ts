/**
 * A query key can legally repeat (`?id=a&id=b`), so expo-router widens every
 * search param to `string | string[]`. Route segments are always single-valued,
 * so collapse to the first entry and fall back to "" — the empty string keeps
 * the `enabled: !!id` guards on the downstream queries switched off.
 */
export function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
