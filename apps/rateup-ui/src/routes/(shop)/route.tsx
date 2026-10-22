import { createFileRoute, Outlet } from "@tanstack/react-router";

import { ShopProviders } from "@/components/shop-public/ShopProviders.tsx";
import { noindexHead } from "@/lib/metadata.ts";

import shopCss from "@/styles/shop.css?url";

/**
 * Layout for the buyer-facing shop: the storefront at /s and the hosted checkout at /c. Shoppers
 * arrive from a chat on a phone, so it loads translations but not the sign-in SDK or the app's
 * full stylesheet. Noindex by default; a live storefront's own head makes it indexable.
 */
export const Route = createFileRoute("/(shop)")({
  beforeLoad: async () => {
    await import("@/i18n");
  },
  component: () => (
    <ShopProviders>
      <Outlet />
    </ShopProviders>
  ),
  head: () => ({
    ...noindexHead(undefined, { follow: false }),
    links: [{ rel: "stylesheet", href: shopCss }],
  }),
});
