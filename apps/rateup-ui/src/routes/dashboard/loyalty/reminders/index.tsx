import { createFileRoute } from "@tanstack/react-router";

import { RemindersPage } from "@/components/dashboard/loyalty/reminders/RemindersPage.tsx";

export const Route = createFileRoute("/dashboard/loyalty/reminders/")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  return <RemindersPage />;
}
