import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/billing/subscriptions")({
  component: () => (
    <ComingSoon title="Subscriptions" description="Every organisation subscription." />
  ),
});
