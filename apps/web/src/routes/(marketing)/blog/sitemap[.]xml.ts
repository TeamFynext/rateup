// src/routes/sitemap[.]xml.ts
import { createFileRoute } from "@tanstack/react-router";

import { getPosts } from "@/lib/posts";

export const Route = createFileRoute("/(marketing)/blog/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const blogs = await getPosts();
        const baseUrl = import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${blogs
    .map(
      (blog) => `
  <url>
    <loc>${baseUrl}/blog/${blog.slug}</loc>
    <lastmod>${new Date(blog.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`,
    )
    .join("")}
</urlset>`;

        return new Response(sitemap, {
          headers: {
            "Content-Type": "application/xml",
          },
        });
      },
    },
  },
});
