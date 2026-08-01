import { createFileRoute } from "@tanstack/react-router";

import { ContactGroup } from "@/components/dashboard/contacts/groups/ContactGroup.tsx";

export const Route = createFileRoute("/dashboard/contacts/groups/$groupId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ContactGroup />;
}
