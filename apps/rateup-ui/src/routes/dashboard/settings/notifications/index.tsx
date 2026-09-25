import { createFileRoute } from "@tanstack/react-router";

import { NotificationsPage } from "@/components/dashboard/settings/notifications/NotificationsPage.tsx";

export const Route = createFileRoute("/dashboard/settings/notifications/")({
  component: NotificationsPage,
});
