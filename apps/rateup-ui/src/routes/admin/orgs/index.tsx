import { createFileRoute } from "@tanstack/react-router";

import { OrgDisplay } from "@/components/admin/orgs/OrgDisplay.tsx";

export const Route = createFileRoute("/admin/orgs/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <OrgDisplay />;
}
