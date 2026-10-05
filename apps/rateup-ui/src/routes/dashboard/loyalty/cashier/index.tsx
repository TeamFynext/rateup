import { createFileRoute } from "@tanstack/react-router";

import { validateCashierSearch } from "@/components/loyalty/cashier/cashier.search.ts";
import { CashierPage } from "@/components/loyalty/cashier/CashierPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/cashier/")({
  validateSearch: validateCashierSearch,
  component: RouteComponent,
});

function RouteComponent() {
  return <CashierPage />;
}
