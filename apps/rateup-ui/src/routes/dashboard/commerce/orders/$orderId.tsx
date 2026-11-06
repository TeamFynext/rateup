import { createFileRoute } from "@tanstack/react-router";

import { OrderDetailPage } from "@/components/dashboard/commerce/pages/OrderDetailPage";

export const Route = createFileRoute("/dashboard/commerce/orders/$orderId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { orderId } = Route.useParams();
  return <OrderDetailPage orderId={orderId} />;
}
