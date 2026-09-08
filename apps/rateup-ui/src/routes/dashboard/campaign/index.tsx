import { createFileRoute } from "@tanstack/react-router";

import { CampaignsPage } from "@/components/dashboard/campaign/CampaignsPage.tsx";
import { CampaignStatus } from "@/types/enums.ts";

function isCampaignStatus(value: unknown): value is CampaignStatus {
  return (
    typeof value === "string" && Object.values(CampaignStatus).includes(value as CampaignStatus)
  );
}

export const Route = createFileRoute("/dashboard/campaign/")({
  // The sidebar's Drafts and Scheduled rows are this page with a status filter
  // applied, so the filter has to live in the URL for those links to mean
  // anything — and so a filtered list survives a refresh.
  validateSearch: (search: Record<string, unknown>): { status?: CampaignStatus } => ({
    status: isCampaignStatus(search.status) ? search.status : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { status } = Route.useSearch();
  return <CampaignsPage initialStatus={status} />;
}
