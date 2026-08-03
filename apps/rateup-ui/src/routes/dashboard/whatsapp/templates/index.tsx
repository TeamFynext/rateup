import { createFileRoute } from "@tanstack/react-router";

import { Template } from "@/components/dashboard/whatsapp/templates/Template.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/templates/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Template />;
}
