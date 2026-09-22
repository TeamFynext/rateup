import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/ops/update-center")({
  component: () => (
    <ComingSoon title="Update center" description="Maintenance tasks: dry-run first, then apply." />
  ),
});
