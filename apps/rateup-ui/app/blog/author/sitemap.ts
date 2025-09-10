import type { MetadataRoute } from "next";

import { getAuthors } from "@/lib/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  //NOTE: Google's limit is 50,000 URLs per sitemap
  const authors = await getAuthors();
  return authors.map((author) => ({
    url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/blog/author/${author.slug}`,
    lastModified: new Date()?.toDateString(),
    priority: 0.64,
  }));
}
