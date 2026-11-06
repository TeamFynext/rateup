import { createFileRoute } from "@tanstack/react-router";

import { storefrontSitemap } from "@/components/shop-public/storefrontSeo.ts";

export const Route = createFileRoute("/(shop)/s/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";
        const { getStorefrontSitemap } = await import("@/backend/commerce/shop.api");
        const { stores } = await getStorefrontSitemap();
        return new Response(storefrontSitemap(stores, baseUrl), {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=0, s-maxage=3600",
          },
        });
      },
    },
  },
});
