import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/ops/test-data")({
  component: () => (
    <ComingSoon title="Test data" description="Generate responses and inbox data for test orgs." />
  ),
});
