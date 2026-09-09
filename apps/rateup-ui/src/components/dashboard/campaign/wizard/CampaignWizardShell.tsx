import { IconArrowLeft, IconArrowRight, IconCloud, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import type { StepperStep } from "@/components/ui/stepper.tsx";
import { Stepper } from "@/components/ui/stepper.tsx";
import { cn } from "@/lib/utils";

interface CampaignWizardShellProps {
  /** The breadcrumb's tail — the campaign's name, or what is about to be created. */
  title: string;
  steps: readonly StepperStep[];
  currentStep: string;
  onStepChange?: (id: string) => void;
  /** Omitted before the draft exists, when there is nothing to have saved yet. */
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  onBack?: () => void;
  canGoBack: boolean;
  onNext?: () => void;
  /** Runs the current step's submit, then leaves. */
  onSaveAndExit?: () => void;
  /** The last step launches from its own body, so the footer drops Next. */
  showNext: boolean;
  /**
   * Throws the draft away. Only passed while the campaign is still a draft — a
   * launched campaign is deleted from its own page, where the consequences of
   * doing so are in front of you.
   */
  onDiscard?: () => void;
  isBusy: boolean;
  /** Steps that lay out their own full-height panels manage their own overflow. */
  scrollBody: boolean;
  children: ReactNode;
}

/**
 * The chrome every wizard step sits in: a 56px breadcrumb bar, the 60px step
 * rail, and a 64px action footer around one body.
 *
 * Shared by `/campaign/new` and `/campaign/:id/edit` deliberately. They are the
 * same flow — the first step of it happens to be the one that creates the row —
 * and when `/new` had its own trimmed-down header, step one was the only screen
 * in the wizard that did not show you where you were in it.
 */
export function CampaignWizardShell({
  title,
  steps,
  currentStep,
  onStepChange,
  isSaving = false,
  lastSavedAt = null,
  onBack,
  canGoBack,
  onNext,
  onSaveAndExit,
  showNext,
  onDiscard,
  isBusy,
  scrollBody,
  children,
}: Readonly<CampaignWizardShellProps>) {
  const { t } = useTranslation("campaign.wizard");

  return (
    <div className="bg-background flex h-full min-h-0 flex-col">
      <header className="border-border bg-card flex h-14 shrink-0 items-center justify-between gap-4 border-b px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/dashboard/campaign"
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-[13px]"
          >
            <IconArrowLeft className="size-3.5" aria-hidden />
            {t("Campaigns")}
          </Link>
          <span className="text-muted-foreground/50" aria-hidden>
            /
          </span>
          <span className="font-display truncate text-[15px] font-semibold">{title}</span>
        </div>
        <SavedIndicator isSaving={isSaving} lastSavedAt={lastSavedAt} />
      </header>

      <div className="border-border bg-card flex h-15 shrink-0 items-center border-b px-8">
        <Stepper steps={steps} currentStep={currentStep} onStepChange={onStepChange} />
      </div>

      {/* min-h-0 is what lets this scroll instead of pushing the footer off. */}
      <div className={cn("min-h-0 flex-1", scrollBody ? "overflow-y-auto" : "flex")}>
        {children}
      </div>

      <footer className="border-border bg-card flex h-16 shrink-0 items-center justify-end gap-2 border-t px-8">
        {/* Pushed to the far left, away from the three controls that move the
            wizard forward — a destructive action next to "Next" is one slip
            from throwing away the thing you were building. */}
        {onDiscard ? (
          <Button
            variant="ghost"
            onClick={onDiscard}
            disabled={isBusy}
            className="text-destructive hover:text-destructive mr-auto"
          >
            <IconTrash className="size-4" aria-hidden />
            {t("Discard draft")}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onBack} disabled={!canGoBack}>
          {t("Back")}
        </Button>
        {/* Runs the step's own submit before leaving. This was a bare link on the
            assumption that each step had already written itself, but a step
            writes on submit — so everything typed since arriving on it left with
            the user. */}
        <Button variant="ghost" onClick={onSaveAndExit} disabled={isBusy}>
          {t("Save & exit")}
        </Button>
        {showNext ? (
          <Button onClick={onNext} disabled={isBusy}>
            {t("Next")}
            <IconArrowRight className="size-4" aria-hidden />
          </Button>
        ) : null}
      </footer>
    </div>
  );
}

/**
 * "Draft · saved just now". Deliberately quiet: the wizard saves on every step,
 * and a toast each time would be six toasts to walk through it.
 */
function SavedIndicator({
  isSaving,
  lastSavedAt,
}: Readonly<{ isSaving: boolean; lastSavedAt: Date | null }>) {
  const { t } = useTranslation("campaign.wizard");
  return (
    <span className="bg-muted text-secondary-foreground ring-foreground/10 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full py-0 pr-2.5 pl-2 text-xs ring-1">
      <IconCloud className="text-muted-foreground size-3.5" aria-hidden />
      {isSaving ? t("Saving…") : lastSavedAt ? t("Draft · saved just now") : t("Draft")}
    </span>
  );
}
