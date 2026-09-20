import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/analytics/audit-log/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/analytics", search: { tab: "logs", log: "activity" } });
  },
});
