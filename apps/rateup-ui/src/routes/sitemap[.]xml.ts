import { createFileRoute } from "@tanstack/react-router";

/**
 * Root sitemap for the marketing pages.
 *
 * `sitemap_index.xml` has always listed `/sitemap.xml`, but the route did not
 * exist — so the index handed search engines a 404 and none of these pages were
 * submitted. This is that missing file; the blog and tools sitemaps stay in
 * their own routes and are listed alongside it in the index.
 */
const MARKETING_PATHS: { path: string; priority: string; changefreq: string }[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/pricing", priority: "0.9", changefreq: "weekly" },
  { path: "/products/omnichannel-inbox", priority: "0.8", changefreq: "monthly" },
  { path: "/products/whatsapp-feedback", priority: "0.8", changefreq: "monthly" },
  { path: "/products/whatsapp-loyalty", priority: "0.8", changefreq: "monthly" },
  { path: "/products/whatsapp-survey", priority: "0.8", changefreq: "monthly" },
  { path: "/products/ai-automation", priority: "0.8", changefreq: "monthly" },
  { path: "/products/ai-review", priority: "0.8", changefreq: "monthly" },
  { path: "/products/qr-studio", priority: "0.8", changefreq: "monthly" },
  { path: "/products/testimonial-gateway", priority: "0.8", changefreq: "monthly" },
  { path: "/products/ticketing", priority: "0.8", changefreq: "monthly" },
  { path: "/about-us", priority: "0.6", changefreq: "yearly" },
  { path: "/contact-us", priority: "0.6", changefreq: "yearly" },
  { path: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms-of-service", priority: "0.3", changefreq: "yearly" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";
        const lastmod = new Date().toISOString();

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${MARKETING_PATHS.map(
  (entry) => `  <url>
    <loc>${baseUrl}${entry.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
).join("\n")}
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
