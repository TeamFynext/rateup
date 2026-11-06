import { createFileRoute } from "@tanstack/react-router";

import { GroupPage } from "@/components/dashboard/contacts/groups/GroupPage.tsx";

export const Route = createFileRoute("/dashboard/contacts/audiences/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GroupPage />;
}
