import { getUnsplashImageQueryString } from "./unsplash.schema";

export async function getUnsplashImageList({
  page = 1,
  query,
  limit = 12,
}: getUnsplashImageQueryString) {
  const url =
    query?.length > 0
      ? `/search/photos?page=${page}&limit=${limit}&query=${query}`
      : `/photos?page=${page}&limit=${limit}`;
  const response = await fetch(
    `${process.env.UNSPLASH_API_URL}${url}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
  );
  return response?.json();
}
