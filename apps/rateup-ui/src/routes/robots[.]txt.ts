// src/routes/robots[.]txt.ts
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";
        // The tenant utility URLs (/ws, /was, /lt, /qr, /public, /loyalty, /cashier) are
        // deliberately NOT disallowed: they carry `noindex` from the (public-facing) layout, and
        // Google has to be able to crawl them to see it. Blocking would freeze the /ws/* URLs
        // that are already indexed.
        const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /_serverFn/
Disallow: /auth/
Disallow: /logout
Sitemap: ${baseUrl}/sitemap_index.xml`;

        return new Response(robots, {
          headers: {
            "Content-Type": "text/plain",
          },
        });
      },
    },
  },
});
