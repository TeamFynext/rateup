import { createFileRoute } from "@tanstack/react-router";

import { OrdersPage } from "@/components/admin/orders/OrdersPage.tsx";

export const Route = createFileRoute("/admin/orders/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <OrdersPage />;
}
