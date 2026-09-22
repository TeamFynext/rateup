import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/billing/orders")({
  component: () => <ComingSoon title="Orders" description="Payment orders across all gateways." />,
});
