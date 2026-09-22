import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/staff")({
  component: () => <ComingSoon title="Staff" description="Who can sign in to this console." />,
});
