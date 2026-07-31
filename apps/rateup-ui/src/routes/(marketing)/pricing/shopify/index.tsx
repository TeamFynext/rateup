import { createFileRoute } from "@tanstack/react-router";

import { ShopifyPage } from "@/components/marketing/pricing/shopify/ShopifyPage.tsx";

export const Route = createFileRoute("/(marketing)/pricing/shopify/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ShopifyPage />;
}
