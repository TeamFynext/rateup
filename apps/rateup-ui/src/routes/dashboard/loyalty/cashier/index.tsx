import { createFileRoute } from "@tanstack/react-router";

import { CashierPage } from "@/components/loyalty/CashierPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/cashier/")({
  component: CashierPage,
});
