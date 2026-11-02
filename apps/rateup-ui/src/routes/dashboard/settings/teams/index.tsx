import { createFileRoute } from "@tanstack/react-router";

import { TeamPage } from "@/components/dashboard/settings/team/TeamPage.tsx";

export const Route = createFileRoute("/dashboard/settings/teams/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TeamPage />;
}
