import { createFileRoute } from "@tanstack/react-router";

import { OrdersPage } from "@/components/dashboard/commerce/pages/OrdersPage";

export const Route = createFileRoute("/dashboard/commerce/orders/")({
  component: OrdersPage,
});
