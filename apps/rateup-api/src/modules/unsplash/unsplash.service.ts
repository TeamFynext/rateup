import {
  getUnsplashImageQueryString,
  triggerDownloadUnsplashBody,
} from "./unsplash.schema.js";

export async function getUnsplashImageList({
  page = 1,
  query,
  limit = 25,
}: getUnsplashImageQueryString) {
  const url =
    query?.length > 0
      ? `/search/photos?page=${page}&per_page=${limit}&query=${query}`
      : `/photos?page=${page}&per_page=${limit}`;
  const response = await fetch(
    `${process.env.UNSPLASH_API_URL}${url}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`,
  );
  return response?.json();
}

export async function triggerDownloadUnsplashImage({
  downloadLocation,
}: triggerDownloadUnsplashBody) {
  const response = await fetch(
    `${downloadLocation}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`,
  );
  return response?.json();
}
