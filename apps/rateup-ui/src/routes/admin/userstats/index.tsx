import { createFileRoute } from "@tanstack/react-router";

import { UserstatsPage } from "@/components/admin/userstats/UserstatsPage.tsx";

export const Route = createFileRoute("/admin/userstats/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <UserstatsPage />;
}
