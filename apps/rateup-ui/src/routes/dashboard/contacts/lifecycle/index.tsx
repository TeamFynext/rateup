import { createFileRoute } from "@tanstack/react-router";

import { ContactSettings } from "@/components/dashboard/contacts/lifecycle/LifecyclePage.tsx";

export const Route = createFileRoute("/dashboard/contacts/lifecycle/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ContactSettings />;
}
