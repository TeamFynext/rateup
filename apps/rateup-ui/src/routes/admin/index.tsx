import { createFileRoute } from "@tanstack/react-router";

import { AdminPage } from "@/components/admin/AdminPage.tsx";

export const Route = createFileRoute("/admin/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AdminPage />;
}
