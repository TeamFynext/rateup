import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/billing/plans")({
  component: () => (
    <ComingSoon
      title="RateUp plans"
      description="Plan catalogue and the features each tier grants."
    />
  ),
});
