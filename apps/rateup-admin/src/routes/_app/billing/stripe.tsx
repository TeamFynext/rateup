import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/billing/stripe")({
  component: () => <ComingSoon title="Stripe" description="Stripe products and subscriptions." />,
});
