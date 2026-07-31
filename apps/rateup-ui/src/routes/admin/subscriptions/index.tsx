import { createFileRoute } from "@tanstack/react-router";

import { SubscriptionPage } from "@/components/admin/subscriptions/SubscriptionPage.tsx";

export const Route = createFileRoute("/admin/subscriptions/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SubscriptionPage />;
}
