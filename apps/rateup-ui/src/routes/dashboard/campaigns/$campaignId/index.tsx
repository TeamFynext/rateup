import { createFileRoute } from "@tanstack/react-router";

import { CampaignDetails } from "@/components/dashboard/campaign/CampaignDetails.tsx";

export const Route = createFileRoute("/dashboard/campaigns/$campaignId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CampaignDetails />;
}
