import { createFileRoute } from "@tanstack/react-router";

import { ContactsPage } from "@/components/dashboard/contacts/ContactsPage.tsx";

export const Route = createFileRoute("/dashboard/contacts/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ContactsPage />;
}
