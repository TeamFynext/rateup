import { joinUrl } from "@rateup/utils/url";

/** Public URL of an uploaded file (an S3 key) on the media CDN. */
export const mediaUrl = (key: string | null | undefined) =>
  joinUrl(import.meta.env.VITE_MEDIA_CDN_URL, key);

/** Public URL of a dashboard image on the web-images CDN. */
export const webImageUrl = (path: string | null | undefined) =>
  joinUrl(import.meta.env.VITE_WEB_IMAGES_CDN_URL, path);

/** Public URL of an Unsplash photo from its key. */
export const unsplashImageUrl = (key: string | null | undefined) =>
  joinUrl(import.meta.env.VITE_UNSPLASH_IMAGES_URL, key);
