import { createFileRoute } from "@tanstack/react-router";

import { TeamPage } from "@/components/dashboard/analytics/team/TeamPage.tsx";

export const Route = createFileRoute("/dashboard/analytics/teams/$teamId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TeamPage />;
}
