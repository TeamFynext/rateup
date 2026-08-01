import { createFileRoute } from "@tanstack/react-router";

import { CardDetailPage } from "@/components/dashboard/tickets/CardDetailPage.tsx";

export const Route = createFileRoute("/dashboard/tickets/$ticketId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CardDetailPage />;
}
