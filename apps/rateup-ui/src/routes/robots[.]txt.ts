// src/routes/robots[.]txt.ts
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";
        const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
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
