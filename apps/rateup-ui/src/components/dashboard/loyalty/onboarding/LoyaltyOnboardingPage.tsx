import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  EventTemplateResult,
  OnboardingStep,
  SkippedCommand,
} from "@/backend/loyalty/onboarding.api";
import { ONBOARDING_STEPS } from "@/backend/loyalty/onboarding.api";
import {
  useActivateLoyaltyProgramMutation,
  useApplyBasicsStepMutation,
  useApplyEarningStepMutation,
  useApplyMessagesStepMutation,
  useApplyRewardsStepMutation,
  useApplyTiersStepMutation,
} from "@/backend/loyalty/onboarding.query";
import { Loader } from "@/components/ui/loader.tsx";
import { Progress } from "@/components/ui/progress.tsx";

import { LOYALTY_PATHS } from "../paths.ts";
import { OnboardingStepper, type StepDefinition } from "./OnboardingStepper.tsx";
import { BusinessTypeStep } from "./steps/BusinessTypeStep.tsx";
import { EarningStep } from "./steps/EarningStep.tsx";
import { MessagesStep } from "./steps/MessagesStep.tsx";
import { ReviewStep } from "./steps/ReviewStep.tsx";
import { RewardsStep } from "./steps/RewardsStep.tsx";
import { TiersStep } from "./steps/TiersStep.tsx";
import { useProgramEditorData } from "./useProgramEditorData.ts";

/** The five saveable steps, plus a final review that only activates. */
const WIZARD_STEPS = [...ONBOARDING_STEPS, "review"] as const;
type WizardStep = (typeof WIZARD_STEPS)[number];

interface LoyaltyOnboardingPageProps {
  /** Deep-link target from the search param, if the user arrived at a specific step. */
  initialStep?: WizardStep;
}

export function LoyaltyOnboardingPage({ initialStep }: Readonly<LoyaltyOnboardingPageProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useProgramEditorData();

  const [stepIndexOverride, setStepIndexOverride] = useState<number | null>(
    initialStep ? WIZARD_STEPS.indexOf(initialStep) : null,
  );
  const [skipped, setSkipped] = useState<SkippedCommand[]>([]);
  const [eventResults, setEventResults] = useState<EventTemplateResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  /**
   * The furthest step already saved, from the server. This — not local state — is what
   * makes the wizard resumable: reopening the page lands wherever the user got to.
   */
  const furthestIndex = useMemo(() => {
    const last = data?.state.lastCompletedStep;
    if (!last) return 0;
    // One past the last *completed* step is where there is still work to do.
    return Math.min(ONBOARDING_STEPS.indexOf(last) + 1, WIZARD_STEPS.length - 1);
  }, [data?.state.lastCompletedStep]);

  const currentIndex = stepIndexOverride ?? furthestIndex;
  const currentStep = WIZARD_STEPS[currentIndex];

  const goTo = useCallback((index: number) => {
    setStepIndexOverride(index);
    setSkipped([]);
    setWarnings([]);
  }, []);

  const advance = useCallback(
    () => goTo(Math.min(currentIndex + 1, WIZARD_STEPS.length - 1)),
    [goTo, currentIndex],
  );

  const basics = useApplyBasicsStepMutation(advance);
  const earning = useApplyEarningStepMutation(advance);
  const tiers = useApplyTiersStepMutation(advance);
  const rewards = useApplyRewardsStepMutation(advance);
  const messages = useApplyMessagesStepMutation((result) => {
    setSkipped(result.skipped);
    setEventResults(result.eventTemplates);
    // A taken keyword needs a decision from the user, so hold them on this step.
    if (result.skipped.length === 0) advance();
  });
  const activate = useActivateLoyaltyProgramMutation((result) => {
    if (result.warnings.length > 0) {
      setWarnings(result.warnings);
    }
    navigate({ to: LOYALTY_PATHS.overview });
  });

  const stepDefinitions: StepDefinition[] = useMemo(
    () => [
      { id: "basics", label: t("Basics") },
      { id: "earning", label: t("Earning") },
      { id: "tiers", label: t("Tiers") },
      { id: "rewards", label: t("Rewards") },
      { id: "messages", label: t("Messages") },
      { id: "review", label: t("Review") },
    ],
    [t],
  );

  if (isLoading || !data) {
    return <Loader />;
  }

  const { state, presets, selectedKey, setPresetKeyOverride, giveback, defaults } = data;
  const progressPct = Math.round((currentIndex / (WIZARD_STEPS.length - 1)) * 100);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("Set up your loyalty program")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Six short steps. Everything is saved as you go, and nothing reaches customers until you activate.",
            )}
          </p>
        </div>

        <OnboardingStepper
          steps={stepDefinitions}
          currentIndex={currentIndex}
          furthestIndex={furthestIndex}
          onSelect={goTo}
        />

        <Progress value={progressPct} className="h-1.5" />
      </header>

      {/*
        Each step is mounted only while it is current, so its `useForm` picks up the
        defaults once, at mount. That is deliberate: a `reset` effect keyed on these
        objects would refire on every parent render (they are rebuilt each time) and wipe
        whatever the user was typing.
      */}
      {currentStep === "basics" && (
        <BusinessTypeStep
          presets={presets}
          selectedKey={selectedKey}
          onSelectPreset={setPresetKeyOverride}
          defaultValues={defaults.basics}
          isSaving={basics.isPending}
          onSubmit={(values) => basics.mutate({ ...values, presetKey: selectedKey })}
        />
      )}

      {currentStep === "earning" && (
        <EarningStep
          defaultValues={defaults.earning}
          currencySymbol={data.currencySymbol}
          pointsName={data.pointsName}
          giveback={giveback}
          isSaving={earning.isPending}
          onBack={() => goTo(currentIndex - 1)}
          onEditAverageOrderValue={() => goTo(0)}
          onSubmit={(values) => earning.mutate(values)}
        />
      )}

      {currentStep === "tiers" && (
        <TiersStep
          defaultValues={defaults.tiers}
          currencySymbol={data.currencySymbol}
          giveback={giveback}
          isSaving={tiers.isPending}
          onBack={() => goTo(currentIndex - 1)}
          onEditAverageOrderValue={() => goTo(0)}
          onSubmit={(values) => tiers.mutate(values)}
        />
      )}

      {currentStep === "rewards" && (
        <RewardsStep
          defaultValues={defaults.rewards}
          pointsName={data.pointsName}
          giveback={giveback}
          isSaving={rewards.isPending}
          onBack={() => goTo(currentIndex - 1)}
          onEditAverageOrderValue={() => goTo(0)}
          tierOptions={state.saved.tiers.map((tier) => ({ value: tier.id, label: tier.name }))}
          onSubmit={(values) => rewards.mutate(values)}
        />
      )}

      {currentStep === "messages" && (
        <MessagesStep
          defaultValues={defaults.messages}
          isSaving={messages.isPending}
          skipped={skipped}
          eventResults={eventResults}
          hasWhatsappChannel={data.hasWhatsappChannel}
          suggestedJoinText={data.suggestedJoinText}
          eventParams={data.eventParams}
          onBack={() => goTo(currentIndex - 1)}
          onSubmit={(values) =>
            messages.mutate({
              commands: values.commands,
              eventTemplates: values.eventTemplates
                .filter((template) => template.enabled)
                .map(({ eventType, templateName, body }) => ({ eventType, templateName, body })),
            })
          }
        />
      )}

      {currentStep === "review" && (
        <ReviewStep
          state={state}
          giveback={giveback}
          isActivating={activate.isPending}
          warnings={warnings}
          onBack={() => goTo(currentIndex - 1)}
          onEditAverageOrderValue={() => goTo(0)}
          onActivate={() => activate.mutate()}
        />
      )}
    </div>
  );
}

export type { WizardStep, OnboardingStep };
