import { createFileRoute } from "@tanstack/react-router";

import { UsersPage } from "@/components/dashboard/settings/users/UsersPage.tsx";

export const Route = createFileRoute("/dashboard/settings/users/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <UsersPage />;
}
