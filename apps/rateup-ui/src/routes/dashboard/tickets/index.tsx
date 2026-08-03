import { createFileRoute } from "@tanstack/react-router";

import { TicketsPage } from "@/components/dashboard/tickets/TicketsPage.tsx";

export const Route = createFileRoute("/dashboard/tickets/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TicketsPage />;
}
