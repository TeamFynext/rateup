import { createFileRoute } from "@tanstack/react-router";

import { FlowsPage } from "@/components/dashboard/whatsapp/flows/FlowsPage.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/flows/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <FlowsPage />;
}
