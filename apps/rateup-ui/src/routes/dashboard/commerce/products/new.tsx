import { createFileRoute } from "@tanstack/react-router";

import { NewProductPage } from "@/components/dashboard/commerce/pages/ProductEditorPage";

export const Route = createFileRoute("/dashboard/commerce/products/new")({
  component: NewProductPage,
});
