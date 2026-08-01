import { createFileRoute } from "@tanstack/react-router";

import { OrgById } from "@/components/admin/orgs/OrgById.tsx";

export const Route = createFileRoute("/admin/orgs/$orgId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <OrgById />;
}
