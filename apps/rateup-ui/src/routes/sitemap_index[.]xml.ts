import { createFileRoute } from "@tanstack/react-router";

const buildSitemapIndex = (sitemaps: string[]) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  for (const sitemapURL of sitemaps) {
    xml += "<sitemap>";
    xml += `<loc>${sitemapURL}</loc>`;
    xml += `<lastmod>${new Date().toISOString()}</lastmod>`;
    xml += "</sitemap>";
  }

  xml += "</sitemapindex>";
  return xml;
};

export const Route = createFileRoute("/sitemap_index.xml")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";

        const sitemaps = [
          `${baseUrl}/sitemap.xml`,
          `${baseUrl}/blog/sitemap.xml`,
          `${baseUrl}/blog/author/sitemap.xml`,
          `${baseUrl}/blog/tag/sitemap.xml`,
        ];

        const sitemapIndexXML = buildSitemapIndex(sitemaps);

        return new Response(sitemapIndexXML, {
          headers: {
            "Content-Type": "application/xml",
          },
        });
      },
    },
  },
});
