// Same helpers as @rateup/utils/url. The API runs from tsc's dist/ in production, which
// cannot load that package's TypeScript source, so they are repeated here.

/** `url` without trailing slashes: `https://cdn.example/` → `https://cdn.example`. */
export function trimTrailingSlash(url: string | null | undefined): string {
  return (url ?? "").replace(/\/+$/, "");
}

/** Joins a base URL and a path with exactly one slash between them. */
export function joinUrl(base: string | null | undefined, path: string | null | undefined): string {
  const tail = (path ?? "").replace(/^\/+/, "");
  return `${trimTrailingSlash(base)}/${tail}`;
}

/** Public URL of an uploaded file (an S3 key) on the media CDN. */
export function mediaUrl(key: string | null | undefined): string {
  return joinUrl(process.env.MEDIA_CDN_URL, key);
}

/** Public URL of a dashboard image on the web-images CDN. */
export function webImageUrl(path: string | null | undefined): string {
  return joinUrl(process.env.WEB_IMAGES_CDN_URL, path);
}
