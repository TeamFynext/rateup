import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  EventTemplateResult,
  LoyaltyPresetKey,
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
  useLoyaltyOnboardingState,
  useLoyaltyPresets,
} from "@/backend/loyalty/onboarding.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Loader } from "@/components/ui/loader.tsx";
import { Progress } from "@/components/ui/progress.tsx";

import { buildGivebackContext } from "./givebackContext.ts";
import { OnboardingStepper, type StepDefinition } from "./OnboardingStepper.tsx";
import { BusinessTypeStep } from "./steps/BusinessTypeStep.tsx";
import { EarningStep } from "./steps/EarningStep.tsx";
import { MessagesStep } from "./steps/MessagesStep.tsx";
import { ReviewStep } from "./steps/ReviewStep.tsx";
import { RewardsStep } from "./steps/RewardsStep.tsx";
import { TiersStep } from "./steps/TiersStep.tsx";

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

  const { data: presetData, isLoading: presetsLoading } = useLoyaltyPresets();
  const { data: state, isLoading: stateLoading } = useLoyaltyOnboardingState();
  const { data: waSettings } = useWaSettings();

  const [stepIndexOverride, setStepIndexOverride] = useState<number | null>(
    initialStep ? WIZARD_STEPS.indexOf(initialStep) : null,
  );
  const [presetKeyOverride, setPresetKeyOverride] = useState<LoyaltyPresetKey | null>(null);
  const [skipped, setSkipped] = useState<SkippedCommand[]>([]);
  const [eventResults, setEventResults] = useState<EventTemplateResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  /**
   * The furthest step already saved, from the server. This — not local state — is what
   * makes the wizard resumable: reopening the page lands wherever the user got to.
   */
  const furthestIndex = useMemo(() => {
    const last = state?.lastCompletedStep;
    if (!last) return 0;
    // One past the last *completed* step is where there is still work to do.
    return Math.min(ONBOARDING_STEPS.indexOf(last) + 1, WIZARD_STEPS.length - 1);
  }, [state?.lastCompletedStep]);

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
    navigate({ to: "/dashboard/loyalty/dashboard" });
  });

  const presets = presetData?.presets ?? [];
  const selectedKey: LoyaltyPresetKey =
    presetKeyOverride ?? state?.presetKey ?? presetData?.suggestedPresetKey ?? "generic";
  const preset = presets.find((p) => p.key === selectedKey) ?? presets[0];

  /**
   * The whole programme, assembled once. Each step overrides only the slice it edits.
   * `state` and `preset` are stable react-query references between refetches, so this
   * survives the re-renders a keystroke causes — which is what keeps the panels' own
   * memos from recomputing on every character typed.
   */
  const giveback = useMemo(
    () => (state && preset ? buildGivebackContext(state, preset) : null),
    [state, preset],
  );

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

  if (presetsLoading || stateLoading || !preset || !state || !giveback) {
    return <Loader />;
  }

  const program = state.program;
  const currencySymbol = program?.currencySymbol ?? "₹";
  const pointsName = program?.currencyName ?? preset.basics.currencyName;
  const progressPct = Math.round((currentIndex / (WIZARD_STEPS.length - 1)) * 100);
  const saved = state.saved;

  // A step the user already saved prefills from the stored rows; only a step never
  // saved falls back to the preset. Stepping backwards must not revert their edits.
  const earningDefaults = {
    rules: saved.rules.length
      ? saved.rules.map((rule) => ({
          name: rule.name,
          description: rule.description ?? "",
          pointsPerUnit: Number(rule.pointsPerUnit),
          multiplier: Number(rule.multiplier),
          bonusPoints: rule.bonusPoints ?? 0,
          allowedDays: rule.allowedDays ?? [],
          isDefault: rule.isDefault,
          priority: rule.priority,
        }))
      : preset.earningRules.map((rule) => ({
          name: rule.name,
          description: rule.description,
          pointsPerUnit: rule.pointsPerUnit,
          multiplier: rule.multiplier ?? 1,
          bonusPoints: rule.bonusPoints ?? 0,
          allowedDays: rule.allowedDays ?? [],
          isDefault: rule.isDefault,
          priority: rule.priority,
        })),
  };

  const tiersDefaults = {
    tiersEnabled: program?.tiersEnabled ?? preset.tiersEnabled,
    tiers: saved.tiers.length
      ? saved.tiers.map((tier) => ({
          name: tier.name,
          threshold: Number(tier.threshold),
          pointsMultiplier: Number(tier.pointsMultiplier),
          color: tier.color,
          benefitsDescription: tier.benefitsDescription ?? "",
        }))
      : preset.tiers.map((tier) => ({
          name: tier.name,
          threshold: tier.threshold,
          pointsMultiplier: tier.multiplier,
          color: tier.color,
          benefitsDescription: tier.benefits_description ?? "",
        })),
  };

  const rewardsDefaults = {
    rewards: saved.rewards.length
      ? saved.rewards.map((reward) => ({
          // Carried so the API updates this row rather than forking a new reward on rename.
          id: reward.id,
          name: reward.name,
          description: reward.description ?? "",
          pointsCost: reward.pointsCost,
          rewardType: normaliseRewardType(reward.rewardType),
          rewardValue: reward.rewardValue ?? {},
        }))
      : preset.rewards.map((reward) => ({
          name: reward.name,
          description: reward.description,
          pointsCost: reward.pointsCost,
          rewardType: reward.rewardType,
          rewardValue: reward.rewardValue,
        })),
  };

  const savedCommandText = new Map(
    saved.commands.map((command) => [command.type, richTextToPlainText(command.content)]),
  );

  const messagesDefaults = {
    commands: preset.commands.map((command) => ({
      type: command.type,
      requestMessage:
        saved.commands.find((c) => c.type === command.type)?.requestMessage ??
        command.requestMessage,
      text: savedCommandText.get(command.type) || command.text,
    })),
    eventTemplates: preset.eventTemplates.map((template) => ({
      eventType: template.eventType,
      templateName: template.templateName,
      body: template.body,
      enabled: true,
    })),
  };

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
        defaults below once, at mount. That is deliberate: a `reset` effect keyed on these
        objects would refire on every parent render (they are rebuilt each time) and wipe
        whatever the user was typing.
      */}
      {currentStep === "basics" && (
        <BusinessTypeStep
          presets={presets}
          selectedKey={selectedKey}
          onSelectPreset={setPresetKeyOverride}
          defaultValues={{
            name: program?.name ?? preset.label,
            currencyName: program?.currencyName ?? preset.basics.currencyName,
            currencyCode: program?.currencyCode ?? "INR",
            currencySymbol: program?.currencySymbol ?? "₹",
            signupBonus: program?.signupBonus ?? preset.basics.signupBonus,
            referralBonus: program?.referralBonus ?? preset.basics.referralBonus,
            refereeBonus: program?.refereeBonus ?? preset.basics.refereeBonus,
            averageOrderValue: program?.averageOrderValue ?? preset.basics.averageOrderValue,
          }}
          isSaving={basics.isPending}
          onSubmit={(values) => basics.mutate({ ...values, presetKey: selectedKey })}
        />
      )}

      {currentStep === "earning" && (
        <EarningStep
          defaultValues={earningDefaults}
          currencySymbol={currencySymbol}
          pointsName={pointsName}
          giveback={giveback}
          isSaving={earning.isPending}
          onBack={() => goTo(currentIndex - 1)}
          onEditAverageOrderValue={() => goTo(0)}
          onSubmit={(values) => earning.mutate(values)}
        />
      )}

      {currentStep === "tiers" && (
        <TiersStep
          defaultValues={tiersDefaults}
          currencySymbol={currencySymbol}
          giveback={giveback}
          isSaving={tiers.isPending}
          onBack={() => goTo(currentIndex - 1)}
          onEditAverageOrderValue={() => goTo(0)}
          onSubmit={(values) => tiers.mutate(values)}
        />
      )}

      {currentStep === "rewards" && (
        <RewardsStep
          defaultValues={rewardsDefaults}
          pointsName={pointsName}
          giveback={giveback}
          isSaving={rewards.isPending}
          onBack={() => goTo(currentIndex - 1)}
          onEditAverageOrderValue={() => goTo(0)}
          onSubmit={(values) => rewards.mutate(values)}
        />
      )}

      {currentStep === "messages" && (
        <MessagesStep
          defaultValues={messagesDefaults}
          isSaving={messages.isPending}
          skipped={skipped}
          eventResults={eventResults}
          hasWhatsappChannel={Boolean(waSettings?.length)}
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

/**
 * Reward status casing is uppercase on the API but `rewardType` is lowercase; a stored
 * row could still carry an unexpected value, so narrow it back to the form's union.
 */
function normaliseRewardType(value: string): "point" | "coupon" | "assigned" {
  return value === "coupon" || value === "assigned" ? value : "point";
}

/**
 * `LoyaltyWaCommand.content` is a rich-text document. The wizard edits plain text, so a
 * saved command is flattened one line per top-level block — the same shape the API's
 * `richTextToPlainText` produces when it sends the reply.
 */
function richTextToPlainText(content: unknown): string {
  const collect = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    const record = node as { text?: unknown; content?: unknown };
    if (typeof record.text === "string") return record.text;
    return Array.isArray(record.content) ? record.content.map(collect).join("") : "";
  };

  if (typeof content === "string") return content;
  const nodes = Array.isArray(content)
    ? content
    : ((content as { content?: unknown })?.content ?? []);

  return Array.isArray(nodes)
    ? nodes
        .map(collect)
        .filter((line) => line.length > 0)
        .join("\n")
    : "";
}
