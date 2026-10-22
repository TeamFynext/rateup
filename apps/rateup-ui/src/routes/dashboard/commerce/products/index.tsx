import { createFileRoute } from "@tanstack/react-router";

import { ProductsPage } from "@/components/dashboard/commerce/pages/ProductsPage";

export const Route = createFileRoute("/dashboard/commerce/products/")({
  component: ProductsPage,
});
