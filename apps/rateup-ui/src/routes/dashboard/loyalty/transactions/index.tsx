import { createFileRoute } from "@tanstack/react-router";

import { TransactionsPage } from "@/components/dashboard/loyalty/transactions/TransactionsPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/transactions/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TransactionsPage />;
}
