import { createFileRoute } from "@tanstack/react-router";

import { ConversationalComponents } from "@/components/dashboard/whatsapp/conversational-components/ConversationalComponents.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/ice-breakers/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ConversationalComponents />;
}
