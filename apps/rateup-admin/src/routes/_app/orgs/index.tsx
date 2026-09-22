import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/orgs/")({
  component: () => (
    <ComingSoon
      title="Organisations"
      description="Search, filter and sort every organisation on the platform."
    />
  ),
});
