import { createFileRoute } from "@tanstack/react-router";

import { GroupPage } from "@/components/dashboard/contacts/groups/GroupPage.tsx";

export const Route = createFileRoute("/dashboard/contacts/groups/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GroupPage />;
}
