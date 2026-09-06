import { useCallback, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton.tsx";

import { CampaignWizardShell } from "./CampaignWizardShell.tsx";
import { AudienceStep } from "./steps/AudienceStep.tsx";
import { BasicsStep } from "./steps/BasicsStep.tsx";
import { RetryStep } from "./steps/RetryStep.tsx";
import { ReviewStep } from "./steps/ReviewStep.tsx";
import { ScheduleStep } from "./steps/ScheduleStep.tsx";
import { TemplateStep } from "./steps/TemplateStep.tsx";
import type { CampaignWizardStep } from "./useCampaignWizard.ts";
import { useCampaignWizard } from "./useCampaignWizard.ts";

interface CampaignWizardProps {
  campaignId: string;
  step: CampaignWizardStep;
}

/**
 * The campaign creation and edit flow, from step two onwards.
 *
 * Replaces the two-tab `CreateCampaignModal`, which collected only a name, a
 * team and a template and left audience and scheduling to two other dialogs
 * opened later from the detail page. Here every step saves against a `DRAFT`
 * campaign as it goes, so there is no giant final submit and nothing is lost by
 * closing the tab.
 */
export function CampaignWizard({ campaignId, step }: Readonly<CampaignWizardProps>) {
  const wizard = useCampaignWizard(campaignId, step);
  const { campaign, isLoading } = wizard;

  // Each step registers what "Next" should submit. A ref rather than state:
  // the shell only ever calls it, and re-rendering the footer on every
  // keystroke inside a step's form would be wasted work.
  const submitRef = useRef<() => void | Promise<void>>(() => wizard.continueAfterSave());
  const registerSubmit = useCallback((submit: () => void | Promise<void>) => {
    submitRef.current = submit;
  }, []);

  if (isLoading || !campaign) {
    return (
      <div className="flex h-full flex-col gap-6 p-8">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  const stepProps = { wizard, registerSubmit };

  return (
    <CampaignWizardShell
      title={campaign.name || "Untitled campaign"}
      steps={wizard.steps}
      currentStep={step}
      onStepChange={wizard.goToStep}
      isSaving={wizard.isSaving}
      lastSavedAt={wizard.lastSavedAt}
      onBack={wizard.goBack}
      canGoBack={!wizard.isFirstStep}
      onNext={() => void submitRef.current()}
      onSaveAndExit={() => void wizard.saveAndExit(() => submitRef.current())}
      showNext={!wizard.isLastStep}
      isBusy={wizard.isSaving}
      // Template and Audience are two full-height panels that scroll internally.
      scrollBody={step !== "template" && step !== "audience"}
    >
      {step === "basics" ? <BasicsStep {...stepProps} /> : null}
      {step === "template" ? <TemplateStep {...stepProps} /> : null}
      {step === "audience" ? <AudienceStep {...stepProps} /> : null}
      {step === "schedule" ? <ScheduleStep {...stepProps} /> : null}
      {step === "retries" ? <RetryStep {...stepProps} /> : null}
      {step === "review" ? <ReviewStep {...stepProps} /> : null}
    </CampaignWizardShell>
  );
}
