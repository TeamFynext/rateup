import { createFileRoute } from "@tanstack/react-router";

import { InstagramDashboard } from "@/components/dashboard/instagram/InstagramDashboard.tsx";
import { INSTAGRAM_TOOLS, toolSearch } from "@/components/dashboard/meta-channels/toolSearch.ts";

export const Route = createFileRoute("/dashboard/instagram/")({
  validateSearch: toolSearch(INSTAGRAM_TOOLS),
  component: RouteComponent,
});

function RouteComponent() {
  return <InstagramDashboard />;
}
