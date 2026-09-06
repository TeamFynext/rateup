import { createFileRoute } from "@tanstack/react-router";

import { NewCampaignPage } from "@/components/dashboard/campaign/wizard/NewCampaignPage.tsx";

export const Route = createFileRoute("/dashboard/campaign/new")({
  component: RouteComponent,
});

function RouteComponent() {
  return <NewCampaignPage />;
}
