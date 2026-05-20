import { createFileRoute } from "@tanstack/react-router";

import Analytics from "@/components/whatsapp/inbox/analytics/analaytics.tsx";

export const Route = createFileRoute("/dashboard/analytics/")({
  component: page,
});

function page() {
  return <Analytics />;
}
