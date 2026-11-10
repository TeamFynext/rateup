// src/routes/.well-known/api-catalog.ts

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/.well-known/api-catalog")({
  server: {
    handlers: {
      GET: async () => {
        const catalog = {
          linkset: [
            {
              anchor: "https://api.rateup.app/api",
              item: [
                {
                  href: "https://docs.rateup.app",
                  rel: "service-doc",
                },
                {
                  href: "https://api.rateup.app/api/health",
                  rel: "status",
                },
                {
                  href: "https://api.rateup.app/api/campaigns",
                  rel: "item",
                },
                {
                  href: "https://api.rateup.app/api/contacts",
                  rel: "item",
                },
                {
                  href: "https://api.rateup.app/api/dashboard",
                  rel: "item",
                },
              ],
            },
          ],
        };

        return new Response(JSON.stringify(catalog), {
          status: 200,
          headers: {
            "Content-Type": "application/linkset+json",
          },
        });
      },
    },
  },
});
