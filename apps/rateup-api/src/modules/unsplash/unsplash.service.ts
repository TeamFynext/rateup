import { getUnsplashImageQueryString, triggerDownloadUnsplashBody } from "./unsplash.schema.js";

const UNSPLASH_API_ORIGIN = "https://api.unsplash.com";
const PHOTO_ID = /^[A-Za-z0-9_-]{1,64}$/;

export class InvalidDownloadLocationError extends Error {
  constructor() {
    super("downloadLocation must be an Unsplash photo download URL");
    this.name = "InvalidDownloadLocationError";
  }
}

export async function getUnsplashImageList({
  page = 1,
  query,
  limit = 25,
}: getUnsplashImageQueryString) {
  const params = new URLSearchParams({ page: String(page), per_page: String(limit) });
  const path = (query?.length ?? 0) > 0 ? "/search/photos" : "/photos";
  if (query?.length) params.set("query", query);
  params.set("client_id", process.env.UNSPLASH_ACCESS_KEY ?? "");
  const response = await fetch(`${process.env.UNSPLASH_API_URL}${path}?${params.toString()}`);
  return response?.json();
}

/**
 * The download endpoint Unsplash asks to be pinged when a photo is used, rebuilt from the
 * client's `links.download_location` so only `https://api.unsplash.com/photos/<id>/download`
 * can ever be fetched with the access key.
 */
export function unsplashDownloadUrl(downloadLocation: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(downloadLocation);
  } catch {
    throw new InvalidDownloadLocationError();
  }
  const match = /^\/photos\/([^/]+)\/download\/?$/.exec(parsed.pathname);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "api.unsplash.com" ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    !match ||
    !PHOTO_ID.test(match[1])
  ) {
    throw new InvalidDownloadLocationError();
  }
  const url = new URL(`/photos/${match[1]}/download`, UNSPLASH_API_ORIGIN);
  const ixid = parsed.searchParams.get("ixid");
  if (ixid) url.searchParams.set("ixid", ixid);
  return url;
}

export async function triggerDownloadUnsplashImage({
  downloadLocation,
}: triggerDownloadUnsplashBody) {
  const url = unsplashDownloadUrl(downloadLocation);
  url.searchParams.set("client_id", process.env.UNSPLASH_ACCESS_KEY ?? "");
  const response = await fetch(url, { redirect: "error" });
  return response?.json();
}
