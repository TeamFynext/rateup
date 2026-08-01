import { createFileRoute } from "@tanstack/react-router";

import { LabelsPage } from "@/components/dashboard/contacts/labels/LabelsPage.tsx";

export const Route = createFileRoute("/dashboard/contacts/labels/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <LabelsPage />;
}
