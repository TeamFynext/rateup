import { createFileRoute } from "@tanstack/react-router";

import { TeamPage } from "@/components/dashboard/settings/team/TeamPage.tsx";

export const Route = createFileRoute("/dashboard/settings/team/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TeamPage />;
}
