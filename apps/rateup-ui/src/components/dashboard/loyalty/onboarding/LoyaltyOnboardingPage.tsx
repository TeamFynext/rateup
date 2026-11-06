import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  EventTemplateResult,
  OnboardingStep,
  SkippedCommand,
  TiersStepPayload,
} from "@/backend/loyalty/onboarding.api";
import { ONBOARDING_STEPS } from "@/backend/loyalty/onboarding.api";
import {
  isTierDowngradeRefusal,
  useActivateLoyaltyProgramMutation,
  useApplyEarningStepMutation,
  useApplyMessagesStepMutation,
  useApplyProfileStepMutation,
  useApplyRewardsStepMutation,
  useApplyTiersStepMutation,
} from "@/backend/loyalty/onboarding.query";
import { SECTION_TITLE } from "@/components/common/page-heading.tsx";
import { Loader } from "@/components/ui/loader.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Stepper, type StepperStep } from "@/components/ui/stepper.tsx";
import { useConfirm } from "@/context/confirm-provider";
import { useUser } from "@/context/UserContext.tsx";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { toProfilePayload } from "./profile.ts";
import { StepTransition } from "./StepChrome.tsx";
import { EarningStep } from "./steps/EarningStep.tsx";
import { LaunchStep } from "./steps/LaunchStep.tsx";
import { MessagesStep } from "./steps/MessagesStep.tsx";
import { ProfileStep } from "./steps/ProfileStep.tsx";
import { RewardsStep } from "./steps/RewardsStep.tsx";
import { VipTierStep } from "./steps/VipTierStep.tsx";
import { useProgramEditorData } from "./useProgramEditorData.ts";
import { toTiersPayload } from "./vipTier.ts";
import { STEP_META, WIZARD_STEPS, type WizardStep } from "./wizardSteps.ts";

interface LoyaltyOnboardingPageProps {
  /** Deep-link target from the search param, if the user arrived at a specific step. */
  initialStep?: WizardStep;
}

/** The step the earn rate and typical spend live on — where every "Change" link points. */
const EARNING_INDEX = WIZARD_STEPS.indexOf("earning");

export function LoyaltyOnboardingPage({ initialStep }: Readonly<LoyaltyOnboardingPageProps>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { user } = useUser();
  const { data, isLoading } = useProgramEditorData();

  const [stepIndexOverride, setStepIndexOverride] = useState<number | null>(
    initialStep ? WIZARD_STEPS.indexOf(initialStep) : null,
  );
  const [skipped, setSkipped] = useState<SkippedCommand[]>([]);
  const [eventResults, setEventResults] = useState<EventTemplateResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [launched, setLaunched] = useState(false);

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

  const goToStep = useCallback((step: WizardStep) => goTo(WIZARD_STEPS.indexOf(step)), [goTo]);

  const advance = useCallback(
    () => goTo(Math.min(currentIndex + 1, WIZARD_STEPS.length - 1)),
    [goTo, currentIndex],
  );

  const profile = useApplyProfileStepMutation(advance);
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
    setWarnings(result.warnings);
    setLaunched(true);
  });

  /**
   * The two-row ladder may remove saved tiers that still have members. The API refuses with
   * 409 until the downgrade is confirmed; the refusal names the tiers, so it is quoted.
   */
  const saveTiers = async (payload: TiersStepPayload) => {
    try {
      await tiers.mutateAsync(payload);
    } catch (error) {
      if (!isTierDowngradeRefusal(error)) return;
      const ok = await confirm({
        title: t("Move members down a tier?"),
        description:
          `${getApiErrorMessage(error, "")} ${t("They move to the tier below and earn at its rate.")}`.trim(),
        confirmText: t("Downgrade and continue"),
      });
      if (ok)
        await tiers.mutateAsync({ ...payload, downgradeCustomers: true }).catch(() => undefined);
    }
  };

  const labels: Record<WizardStep, string> = {
    profile: t("Profile"),
    earning: t("Earning"),
    tiers: t("Tiers"),
    rewards: t("Rewards"),
    messages: t("Messages"),
    launch: t("Launch"),
  };

  const stepperSteps: StepperStep[] = WIZARD_STEPS.map((id, index) => {
    const Icon = STEP_META[id].icon;
    return {
      id,
      label: labels[id],
      complete: index < furthestIndex,
      enabled: index <= furthestIndex,
      icon: <Icon size={13} />,
      meta: t("{count} min", { count: STEP_META[id].minutes }),
    };
  });

  if (isLoading || !data) {
    return <Loader />;
  }

  const { state, giveback, defaults } = data;
  const progressPct = Math.round((currentIndex / (WIZARD_STEPS.length - 1)) * 100);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className={SECTION_TITLE}>{t("Set up your loyalty program")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Six short steps, about ten minutes. Everything is saved as you go, and nothing reaches customers until you activate.",
            )}
          </p>
        </div>

        <Stepper
          steps={stepperSteps}
          currentStep={currentStep}
          onStepChange={(id) => goTo(WIZARD_STEPS.findIndex((step) => step === id))}
        />

        <Progress value={progressPct} className="h-1.5" />
      </header>

      {/*
        Each step is mounted only while it is current, so its `useForm` picks up the
        defaults once, at mount. That is deliberate: a `reset` effect keyed on these
        objects would refire on every parent render (they are rebuilt each time) and wipe
        whatever the user was typing.
      */}
      <StepTransition stepKey={currentStep}>
        {currentStep === "profile" && (
          <ProfileStep
            defaultValues={defaults.profile}
            isSaving={profile.isPending}
            pointsName={data.pointsName}
            presets={data.presets}
            selectedPresetKey={data.selectedPresetKey}
            onSelectPreset={data.selectPreset}
            onSubmit={(values) =>
              profile.mutate({ ...toProfilePayload(values), presetKey: data.selectedPresetKey })
            }
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
            onSubmit={(values) => earning.mutate(values)}
          />
        )}

        {currentStep === "tiers" && (
          <VipTierStep
            defaultValues={defaults.tiers}
            currencySymbol={data.currencySymbol}
            currencyCode={giveback.currencyCode}
            isSaving={tiers.isPending}
            onBack={() => goTo(currentIndex - 1)}
            onSubmit={(values) => void saveTiers(toTiersPayload(values))}
          />
        )}

        {currentStep === "rewards" && (
          <RewardsStep
            defaultValues={defaults.rewards}
            pointsName={data.pointsName}
            giveback={giveback}
            isSaving={rewards.isPending}
            onBack={() => goTo(currentIndex - 1)}
            onEditAverageOrderValue={() => goTo(EARNING_INDEX)}
            tierOptions={state.saved.tiers.map((tier) => ({ value: tier.id, label: tier.name }))}
            upperTiers={data.upperTiers}
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

        {currentStep === "launch" && (
          <LaunchStep
            state={state}
            giveback={giveback}
            hasWhatsappChannel={data.hasWhatsappChannel}
            whatsappNumber={data.whatsappNumber}
            joinKeyword={data.joinKeyword}
            orgId={user?.orgId}
            isActivating={activate.isPending}
            launched={launched}
            warnings={warnings}
            onBack={() => goTo(currentIndex - 1)}
            onGoTo={goToStep}
            onEditAverageOrderValue={() => goTo(EARNING_INDEX)}
            onActivate={() => activate.mutate()}
          />
        )}
      </StepTransition>
    </div>
  );
}

export type { WizardStep, OnboardingStep };
