import { createFileRoute } from "@tanstack/react-router";

import { UpdateAllThemes } from "@/components/admin/updateCenter/UpdateAllThemes.tsx";

export const Route = createFileRoute("/admin/updateCenter/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <UpdateAllThemes />;
}
