import { createFileRoute } from "@tanstack/react-router";

import { UpdateCenter } from "@/components/admin/updateCenter/UpdateCenter.tsx";

export const Route = createFileRoute("/admin/updateCenter/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <UpdateCenter />;
}
