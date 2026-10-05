import { createFileRoute } from "@tanstack/react-router";

import { CampaignWizard } from "@/components/dashboard/campaign/wizard/CampaignWizard.tsx";
import {
  isCampaignWizardStep,
  type CampaignWizardStep,
} from "@/components/dashboard/campaign/wizard/wizardSteps.ts";

export const Route = createFileRoute("/dashboard/campaign/$campaignId/edit")({
  // The step rides in the URL so browser back/forward and a refresh all land on
  // the step the person was actually on. An unrecognised value falls back to the
  // first step rather than rendering nothing.
  validateSearch: (search: Record<string, unknown>): { step: CampaignWizardStep } => ({
    step: isCampaignWizardStep(search.step) ? search.step : "basics",
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { campaignId } = Route.useParams();
  const { step } = Route.useSearch();
  return <CampaignWizard campaignId={campaignId} step={step} />;
}
