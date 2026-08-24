import { createFileRoute } from "@tanstack/react-router";

import { NPS_TEMPLATES } from "@/config/npsTemplates.ts";
import { TOOLS, TOOLS_BASE_PATH, toolPath } from "@/config/tools.ts";

/**
 * Sitemap for the tools cluster. Registered in `sitemap_index.xml.ts`.
 * Reads the tool registry and the NPS template list so a new entry in either is
 * submitted to search engines without a second edit here.
 */
export const Route = createFileRoute("/(marketing)/tools/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";
        const lastmod = new Date().toISOString();

        const urls = [
          { loc: `${baseUrl}${TOOLS_BASE_PATH}`, priority: "0.9" },
          ...TOOLS.map((tool) => ({
            loc: `${baseUrl}${toolPath(tool.slug)}`,
            priority: "0.8",
          })),
          ...NPS_TEMPLATES.map((template) => ({
            loc: `${baseUrl}${toolPath("nps-survey-templates")}/${template.slug}`,
            priority: "0.6",
          })),
        ];

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${url.priority}</priority>
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
