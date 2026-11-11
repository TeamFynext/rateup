import { joinUrl } from "@rateup/utils/url";

// Expo inlines EXPO_PUBLIC_ values only when read as `process.env.NAME`, so each is spelled out.

/** Public URL of an uploaded file (an S3 key) on the media CDN. */
export const mediaUrl = (key: string | null | undefined) =>
  joinUrl(process.env.EXPO_PUBLIC_MEDIA_CDN_URL, key);

/** Public URL of a dashboard image on the web-images CDN. */
export const webImageUrl = (path: string | null | undefined) =>
  joinUrl(process.env.EXPO_PUBLIC_WEB_IMAGES_CDN_URL, path);

/** Public URL of an Unsplash photo from its key. */
export const unsplashImageUrl = (key: string | null | undefined) =>
  joinUrl(process.env.EXPO_PUBLIC_UNSPLASH_IMAGES_URL, key);
