import { createFileRoute } from "@tanstack/react-router";

import { DuplicatesPage } from "@/components/dashboard/contacts/duplicates/DuplicatesPage.tsx";

export const Route = createFileRoute("/dashboard/contacts/duplicates/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DuplicatesPage />;
}
