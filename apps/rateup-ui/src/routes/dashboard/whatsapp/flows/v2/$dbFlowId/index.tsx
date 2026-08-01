import { createFileRoute } from "@tanstack/react-router";

import { Flow } from "@/components/dashboard/whatsapp/flows/v2/Flow.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/flows/v2/$dbFlowId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Flow />;
}
