import { createFileRoute } from "@tanstack/react-router";

import { CustomerPage } from "@/components/dashboard/loyalty/customers/CustomerPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/customers/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CustomerPage />;
}
