import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";

import {
  useCampaignById,
  useCampaignRetryPolicy,
  useUpdateCampaignMutation,
} from "@/backend/campaign/campaign.query";
import type { StepperStep } from "@/components/ui/stepper";
import type { RequestPayload } from "@/types/api.ts";
import { CampaignType } from "@/types/enums.ts";
import type { Campaign } from "@/types/global";

/** The wizard's steps, in order. `id` is what rides in `?step=`. */
export const CAMPAIGN_WIZARD_STEPS = [
  "basics",
  "template",
  "audience",
  "schedule",
  "retries",
  "review",
] as const;

export type CampaignWizardStep = (typeof CAMPAIGN_WIZARD_STEPS)[number];

export function isCampaignWizardStep(value: unknown): value is CampaignWizardStep {
  return typeof value === "string" && (CAMPAIGN_WIZARD_STEPS as readonly string[]).includes(value);
}

/**
 * The two steps a campaign cannot launch without. Everything else can be left
 * for later, which is the point of the draft: someone who knows the name and the
 * template can stop there and come back.
 */
const REQUIRED_STEPS: readonly CampaignWizardStep[] = ["basics", "template"];

export interface CampaignWizardState {
  campaign: Campaign | undefined;
  isLoading: boolean;
  step: CampaignWizardStep;
  steps: StepperStep[];
  /** Steps a drip campaign never shows — retries are the drip cron's job. */
  visibleSteps: CampaignWizardStep[];
  isDrip: boolean;
  goToStep: (step: string) => void;
  goNext: () => void;
  goBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  /** Save a partial campaign and stay put. Resolves false if the save failed. */
  save: (values: RequestPayload) => Promise<boolean>;
  /** Save, then go wherever the footer asked — the next step, or out. */
  saveAndContinue: (values: RequestPayload) => Promise<void>;
  /**
   * Go where the footer asked, for a step that wrote its changes by some route
   * other than `save` — the Audience step enrols participants through their own
   * mutation, and still has to honour "Save & exit".
   */
  continueAfterSave: () => void;
  /** Run the current step's submit, then leave the wizard instead of advancing. */
  saveAndExit: (submit: () => void | Promise<void>) => Promise<void>;
  isSaving: boolean;
  /** When the draft was last written, for the header's saved indicator. */
  lastSavedAt: Date | null;
  canLaunch: boolean;
}

/** Exported so `/campaign/new` renders the same rail before a draft exists. */
export const STEP_LABELS: Record<CampaignWizardStep, string> = {
  basics: "Basics",
  template: "Template",
  audience: "Audience",
  schedule: "Schedule",
  retries: "Retries",
  review: "Review",
};

/**
 * Everything the wizard shell and its steps need, resolved from the URL and the
 * saved campaign rather than from local state.
 *
 * Completion is derived from the campaign payload on purpose. Tracking it in a
 * `useState` — the way `OnboardingWizard.tsx` does — makes a resumed draft open
 * with every step showing as unfinished, which is exactly the moment the
 * indicator matters most.
 */
export function useCampaignWizard(
  campaignId: string,
  step: CampaignWizardStep,
): CampaignWizardState {
  const navigate = useNavigate();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Where the next successful save should land. A ref, not state: the footer
  // sets it immediately before it invokes the step's submit, and a state update
  // would not have reached that submit's closure in time.
  const destinationRef = useRef<"next" | "exit">("next");

  const { data: campaign, isLoading } = useCampaignById(campaignId);
  const { data: retryPolicy } = useCampaignRetryPolicy(campaignId);

  const isDrip = campaign?.type === CampaignType.DRIP;

  const updateMutation = useUpdateCampaignMutation(
    campaignId,
    campaign?.teamId ?? "",
    undefined,
    campaign?.type,
    { silent: true },
  );

  const visibleSteps = useMemo(
    () => CAMPAIGN_WIZARD_STEPS.filter((id) => !(isDrip && id === "retries")),
    [isDrip],
  );

  const completion = useMemo<Record<CampaignWizardStep, boolean>>(() => {
    if (!campaign) {
      return {
        basics: false,
        template: false,
        audience: false,
        schedule: false,
        retries: false,
        review: false,
      };
    }
    return {
      // The campaign exists, so step 1 was submitted — that is what created it.
      basics: Boolean(campaign.name && campaign.teamId),
      template: isDrip ? Boolean(campaign.dripStages?.length) : Boolean(campaign.waTemplateId),
      audience: (campaign.campaignParticipantsCount ?? 0) > 0,
      // Optional steps count as done once they hold a deliberate choice. A
      // campaign that has never been near the schedule step has neither.
      schedule: Boolean(campaign.campaignSentAt) || campaign.dailySendLimit != null,
      retries: Boolean(retryPolicy),
      review: false,
    };
  }, [campaign, isDrip, retryPolicy]);

  const canLaunch = REQUIRED_STEPS.every((id) => completion[id]);

  const steps = useMemo<StepperStep[]>(
    () =>
      visibleSteps.map((id) => ({
        id,
        label: STEP_LABELS[id],
        complete: completion[id],
        // Nothing past Basics exists until the draft does, because every later
        // step saves against a campaign id.
        enabled: id === "basics" || Boolean(campaign),
      })),
    [visibleSteps, completion, campaign],
  );

  const index = Math.max(visibleSteps.indexOf(step), 0);

  const goToStep = useCallback(
    (next: string) => {
      if (!isCampaignWizardStep(next)) return;
      void navigate({
        to: "/dashboard/campaign/$campaignId/edit",
        params: { campaignId },
        search: { step: next },
        // The wizard's own rail is the navigation; letting the router restore
        // scroll on top of it jumps the body after the step has already changed.
        resetScroll: false,
      });
    },
    [campaignId, navigate],
  );

  const goNext = useCallback(() => {
    const next = visibleSteps[index + 1];
    if (next) goToStep(next);
  }, [visibleSteps, index, goToStep]);

  const goBack = useCallback(() => {
    const previous = visibleSteps[index - 1];
    if (previous) goToStep(previous);
  }, [visibleSteps, index, goToStep]);

  const save = useCallback(
    async (values: RequestPayload) => {
      try {
        await updateMutation.mutateAsync({ campaignId, data: values });
        setLastSavedAt(new Date());
        return true;
      } catch {
        // The mutation's own onError has already told the user.
        return false;
      }
    },
    [campaignId, updateMutation],
  );

  const leave = useCallback(() => {
    void navigate({ to: "/dashboard/campaign" });
  }, [navigate]);

  const continueAfterSave = useCallback(() => {
    const destination = destinationRef.current;
    destinationRef.current = "next";
    if (destination === "exit") leave();
    else goNext();
  }, [goNext, leave]);

  const saveAndContinue = useCallback(
    async (values: RequestPayload) => {
      if (await save(values)) continueAfterSave();
    },
    [save, continueAfterSave],
  );

  /**
   * "Save & exit" is the step's own submit with a different destination.
   *
   * It used to be a plain link to the campaign list, on the assumption that
   * every step had already written its changes — but a step writes on submit,
   * so whatever was typed since arriving on it was dropped on the way out. The
   * button now runs the same validation and the same save as Next, which is why
   * this takes the submit rather than duplicating six payloads.
   */
  const saveAndExit = useCallback(async (submit: () => void | Promise<void>) => {
    destinationRef.current = "exit";
    try {
      await submit();
    } finally {
      // A step that refused to save (an invalid form) keeps the user on it, so
      // the next Next must not inherit this.
      destinationRef.current = "next";
    }
  }, []);

  return {
    campaign,
    isLoading,
    step,
    steps,
    visibleSteps,
    isDrip,
    goToStep,
    goNext,
    goBack,
    isFirstStep: index === 0,
    isLastStep: index === visibleSteps.length - 1,
    save,
    saveAndContinue,
    continueAfterSave,
    saveAndExit,
    isSaving: updateMutation.isPending,
    lastSavedAt,
    canLaunch,
  };
}
