import { createFileRoute } from "@tanstack/react-router";

import { ShopifyPage } from "@/components/marketing/pricing/shopify/ShopifyPage.tsx";
import { loadAppRuntime } from "@/lib/appRuntime";
import { noindexHead } from "@/lib/metadata.ts";

/**
 * Shopify billing OAuth callback, not a landing page — it has no H1 and nothing to rank for,
 * and it sits on the URL a Shopify page would want. Kept out of the index.
 */
export const Route = createFileRoute("/(marketing)/pricing/shopify/")({
  // The one marketing URL that reads the session and translates, so it loads the app runtime.
  beforeLoad: loadAppRuntime,
  component: RouteComponent,
  head: () => noindexHead("/integrations/shopify"),
});

function RouteComponent() {
  return <ShopifyPage />;
}
