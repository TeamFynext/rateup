import { createFileRoute, redirect } from "@tanstack/react-router";

/** The audit log moved to Settings; old links keep working. */
export const Route = createFileRoute("/dashboard/analytics/audit-log/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/settings/audit-log", replace: true });
  },
});
