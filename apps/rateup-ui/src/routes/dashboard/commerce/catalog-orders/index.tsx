import { createFileRoute } from "@tanstack/react-router";

import { CatalogOrdersPage } from "@/components/dashboard/commerce/pages/CatalogOrdersPage";

export const Route = createFileRoute("/dashboard/commerce/catalog-orders/")({
  component: CatalogOrdersPage,
});
