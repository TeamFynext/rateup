import { createFileRoute } from "@tanstack/react-router";

import { PaymentsPage } from "@/components/dashboard/commerce/pages/PaymentsPage";

export const Route = createFileRoute("/dashboard/commerce/payments/")({
  component: PaymentsPage,
});
