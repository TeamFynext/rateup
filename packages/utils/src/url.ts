/** `url` without trailing slashes: `https://cdn.example/` → `https://cdn.example`. */
export function trimTrailingSlash(url: string | null | undefined): string {
  return (url ?? "").replace(/\/+$/, "");
}

/**
 * Joins a base URL and a path with exactly one slash between them, whether or not the base
 * ends with one or the path starts with one. Env URLs are stored without a trailing slash;
 * this keeps the result right either way.
 *
 *   joinUrl("https://cdn.example", "a/b.png")   → "https://cdn.example/a/b.png"
 *   joinUrl("https://cdn.example/", "/a/b.png") → "https://cdn.example/a/b.png"
 */
export function joinUrl(base: string | null | undefined, path: string | null | undefined): string {
  const tail = (path ?? "").replace(/^\/+/, "");
  return `${trimTrailingSlash(base)}/${tail}`;
}
