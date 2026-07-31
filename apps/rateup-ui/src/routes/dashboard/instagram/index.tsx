import { createFileRoute } from "@tanstack/react-router";

import { InstagramDashboard } from "@/components/dashboard/instagram/InstagramDashboard.tsx";

export const Route = createFileRoute("/dashboard/instagram/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <InstagramDashboard />;
}
