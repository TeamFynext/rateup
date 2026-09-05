import { createFileRoute } from "@tanstack/react-router";

import { SITEMAP_LASTMOD, sitemapEntries } from "@/lib/metadata.ts";

/**
 * Root sitemap for the marketing pages, generated from the `pageMetadata` registry so a new
 * page is submitted without a second edit here. `noindex` pages and anything covered by
 * another sitemap (`/blog`, `/tools/*`) opt out via `sitemap: false` in the registry.
 *
 * `public/sitemap.xml` used to shadow this route with a stale 12-URL file and has been deleted.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries()
  .map(
    ({ path, entry }) => `  <url>
    <loc>${baseUrl}${path === "/" ? "/" : path}</loc>
    <lastmod>${entry.lastmod ?? SITEMAP_LASTMOD}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join("\n")}
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
