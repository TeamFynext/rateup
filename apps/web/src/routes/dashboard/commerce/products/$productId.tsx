import { createFileRoute } from "@tanstack/react-router";

import { EditProductPage } from "@/components/dashboard/commerce/pages/ProductEditorPage";

export const Route = createFileRoute("/dashboard/commerce/products/$productId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { productId } = Route.useParams();
  return <EditProductPage productId={productId} />;
}
