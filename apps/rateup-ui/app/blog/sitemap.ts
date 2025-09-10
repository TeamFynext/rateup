import type { MetadataRoute } from "next";

import { getPosts } from "@/lib/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  //NOTE: Google's limit is 50,000 URLs per sitemap
  const blogs = await getPosts();
  return blogs.map((blog) => ({
    url: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/blog/${blog.slug}`,
    lastModified: blog.updated_at || blog.published_at,
    priority: 0.8,
  }));
}
