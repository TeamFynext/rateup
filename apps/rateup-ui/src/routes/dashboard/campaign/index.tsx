import { createFileRoute } from "@tanstack/react-router";

import { CampaignsPage } from "@/components/dashboard/campaign/CampaignsPage.tsx";

export const Route = createFileRoute("/dashboard/campaign/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CampaignsPage />;
}
