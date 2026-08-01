import { createFileRoute } from "@tanstack/react-router";

import { TeamPage } from "@/components/dashboard/analytics/team/TeamPage.tsx";

export const Route = createFileRoute("/dashboard/analytics/team/$teamid/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TeamPage />;
}
