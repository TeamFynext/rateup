import { createFileRoute } from "@tanstack/react-router";

import { ShopifyPage } from "@/components/admin/shopify/ShopifyPage.tsx";

export const Route = createFileRoute("/admin/shopify/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ShopifyPage />;
}
