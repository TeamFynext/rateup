import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/shell/coming-soon";

export const Route = createFileRoute("/_app/audit")({
  component: () => <ComingSoon title="Audit log" description="Every action taken by staff." />,
});
