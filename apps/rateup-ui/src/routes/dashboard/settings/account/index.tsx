import { createFileRoute } from "@tanstack/react-router";

import { AccountPage } from "@/components/dashboard/settings/account/AccountPage.tsx";

export const Route = createFileRoute("/dashboard/settings/account/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AccountPage />;
}
