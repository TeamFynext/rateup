// src/routes/sitemap[.]xml.ts
import { createFileRoute } from "@tanstack/react-router";

import { getAuthors } from "@/lib/posts";

export const Route = createFileRoute("/(marketing)/blog/author/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const authors = await getAuthors();

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://myapp.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${authors
    .map(
      (author) => `
  <url>
    <loc>${import.meta.env.VITE_FRONTEND_URL}/blog/author/${author.slug}</loc>
    <lastmod>${new Date()?.toDateString()}</lastmod>
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
