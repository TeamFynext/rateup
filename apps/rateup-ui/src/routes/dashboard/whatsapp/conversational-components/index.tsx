import { createFileRoute, redirect } from "@tanstack/react-router";

/** Conversational components were renamed Ice Breakers & Commands; old links keep working. */
export const Route = createFileRoute("/dashboard/whatsapp/conversational-components/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/whatsapp/ice-breakers", replace: true });
  },
});
