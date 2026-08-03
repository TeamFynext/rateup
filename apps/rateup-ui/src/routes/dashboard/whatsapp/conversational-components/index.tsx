import { createFileRoute } from "@tanstack/react-router";

import { ConversationalComponents } from "@/components/dashboard/whatsapp/conversational-components/ConversationalComponents.tsx";

export const Route = createFileRoute("/dashboard/whatsapp/conversational-components/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ConversationalComponents />;
}
