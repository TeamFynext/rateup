import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useDeleteCampaignMutation } from "@/backend/campaign/campaign.query";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { CampaignStatus } from "@/types/enums.ts";

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
  const { t } = useTranslation("campaign.wizard");
  const navigate = useNavigate();
  const confirm = useConfirm();
  const deleteCampaign = useDeleteCampaignMutation(campaign?.teamId, campaign?.type);

  // Each step registers what "Next" should submit. A ref rather than state:
  // the shell only ever calls it, and re-rendering the footer on every
  // keystroke inside a step's form would be wasted work.
  const submitRef = useRef<() => void | Promise<void>>(() => wizard.continueAfterSave());
  const registerSubmit = useCallback((submit: () => void | Promise<void>) => {
    submitRef.current = submit;
  }, []);

  /**
   * Throw the draft away.
   *
   * A draft only ever opens the wizard — the list card routes here rather than
   * to the campaign page — so without this there is no way to delete one at all.
   */
  const handleDiscard = useCallback(async () => {
    const shouldDelete = await confirm({
      title: t("Discard draft"),
      description: t("This draft and everything set up on it are deleted. This cannot be undone."),
      confirmText: t("Discard"),
      cancelText: t("Keep editing"),
    });
    if (!shouldDelete) return;

    deleteCampaign.mutate(campaignId, {
      onSuccess: () => void navigate({ to: "/dashboard/campaign" }),
    });
  }, [confirm, t, deleteCampaign, campaignId, navigate]);

  // A drip has no Retries step, but the URL will still carry `?step=retries` —
  // from a bookmark, or from browser history left by a broadcast. `visibleSteps`
  // does not contain it, so the footer's index fell back to 0: Back was disabled
  // and Next jumped backwards to Template, all while the hidden step rendered.
  const { visibleSteps, goToStep } = wizard;
  const stepIsVisible = visibleSteps.includes(step);

  useEffect(() => {
    if (!isLoading && campaign && !stepIsVisible) goToStep(visibleSteps[0]);
  }, [isLoading, campaign, stepIsVisible, visibleSteps, goToStep]);

  if (isLoading || !campaign || !stepIsVisible) {
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
      // Only a draft is discardable here. Once launched, the campaign has sends
      // and results behind it, and deleting it belongs on its own page.
      onDiscard={campaign.status === CampaignStatus.DRAFT ? () => void handleDiscard() : undefined}
      isBusy={wizard.isSaving || deleteCampaign.isPending}
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
