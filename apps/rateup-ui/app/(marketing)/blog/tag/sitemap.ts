import type { MetadataRoute } from "next";

import { getTags } from "@/lib/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tags = await getTags();
  return tags.map((tag) => ({
    url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/blog/tag/${tag.slug}`,
    lastModified: new Date()?.toDateString(),
    priority: 0.64,
  }));
}
