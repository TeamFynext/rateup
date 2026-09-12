import { createFileRoute } from "@tanstack/react-router";

import { CustomerPage } from "@/components/dashboard/loyalty/customers/CustomerPage.tsx";
import { customersSearchSchema } from "@/components/dashboard/loyalty/customers/customers.search.ts";

export const Route = createFileRoute("/dashboard/loyalty/customers/")({
  validateSearch: customersSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  return <CustomerPage search={search} />;
}
