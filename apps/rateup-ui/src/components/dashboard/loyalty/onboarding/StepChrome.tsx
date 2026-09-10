import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { useConfirm } from "@/context/confirm-provider";
import { cn } from "@/lib/utils.ts";

import type { StepTone } from "./wizardSteps.ts";

/**
 * The five step forms are mounted by two screens: the setup wizard (Back / Continue, the
 * cost panel inline under the fields) and the Program page's section editors (Discard /
 * Save, the cost panel in a rail beside the fields, updating as you type). `mode` is the
 * only thing that differs; everything a step knows about its own fields is the same.
 */
export type StepMode = "wizard" | "section";

/**
 * The one place a step's accent becomes classes. Blue is the brand; amber (the star) is
 * reserved for the VIP tier; green marks the WhatsApp channel. Nothing else gets a colour.
 */
const TONE_CLASSES: Record<StepTone, string> = {
  blue: "bg-ru-blue-50 text-ru-blue-600 dark:bg-ru-blue-900/40 dark:text-ru-blue-200",
  amber: "bg-ru-amber-50 text-ru-amber-600 dark:bg-ru-amber-700/25 dark:text-ru-amber-300",
  green: "bg-ru-green-50 text-ru-green-600 dark:bg-ru-green-700/30 dark:text-ru-green-300",
};

/** A tinted square behind an icon — the header of every step and section card. */
export function StepIconChip({
  tone = "blue",
  size = "md",
  className,
  children,
}: Readonly<{
  tone?: StepTone;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        size === "md" ? "size-9 [&>svg]:size-5" : "size-7 [&>svg]:size-4",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Title and lead-in copy, so every step reads the same way. */
export function StepHeader({
  title,
  description,
  icon,
  tone,
}: Readonly<{ title: string; description: string; icon?: React.ReactNode; tone?: StepTone }>) {
  return (
    <div className="flex items-start gap-3">
      {icon && <StepIconChip tone={tone}>{icon}</StepIconChip>}
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/** A section heading inside a step: small icon chip, title, one line under it. */
export function SectionHeading({
  title,
  description,
  icon,
  tone,
  action,
}: Readonly<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: StepTone;
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        {icon && (
          <StepIconChip tone={tone} size="sm">
            {icon}
          </StepIconChip>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * Where the cost panel sits. In the wizard it follows the fields; in a section editor it is
 * a sticky rail on wide screens and simply follows the fields on narrow ones.
 */
export function StepLayout({
  mode,
  aside,
  children,
}: Readonly<{ mode: StepMode; aside: React.ReactNode; children: React.ReactNode }>) {
  if (mode === "wizard") {
    return (
      <>
        {children}
        {aside}
      </>
    );
  }
  // A section with nothing for the rail (Profile: its preview lives on Materials) takes
  // the full width rather than leaving an empty 300px column.
  if (aside === null || aside === undefined || aside === false) {
    return <div className="flex min-w-0 flex-col gap-6">{children}</div>;
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-4">{aside}</aside>
    </div>
  );
}

/**
 * A short fade-up as a step arrives. Keyed on the step id so the form remounts — which is
 * what the wizard relies on for `useForm` to pick up fresh defaults. No exit animation:
 * the previous form is gone before the next one is measured, and that is deliberate.
 */
export function StepTransition({
  stepKey,
  children,
}: Readonly<{ stepKey: string; children: React.ReactNode }>) {
  const reduce = useReducedMotion();
  if (reduce) return <div key={stepKey}>{children}</div>;
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Back / continue pair. In section mode the left slot becomes Discard and the submit
 * reads Save — pass `secondaryAction` and `submitLabel`.
 */
export function StepFooter({
  isSaving,
  onBack,
  submitLabel,
  extra,
  secondaryAction,
}: Readonly<{
  isSaving: boolean;
  onBack?: () => void;
  submitLabel?: string;
  extra?: React.ReactNode;
  /** Replaces Back: a way out of the editor that does not save. */
  secondaryAction?: { label: string; onClick: () => void };
}>) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        {secondaryAction ? (
          <Button
            type="button"
            variant="ghost"
            onClick={secondaryAction.onClick}
            disabled={isSaving}
          >
            {secondaryAction.label}
          </Button>
        ) : (
          onBack && (
            <Button type="button" variant="ghost" onClick={onBack} disabled={isSaving}>
              {t("Back")}
            </Button>
          )
        )}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t("Saving…") : (submitLabel ?? t("Continue"))}
        </Button>
      </div>
    </div>
  );
}

/**
 * The footer props a step passes for its mode. Leaving a section editor with unsaved edits
 * asks first; leaving the wizard step goes back a step, as it always did.
 */
export function useStepFooterProps({
  mode,
  isDirty,
  onBack,
  onCancel,
}: Readonly<{
  mode: StepMode;
  isDirty: boolean;
  onBack?: () => void;
  onCancel?: () => void;
}>): Pick<React.ComponentProps<typeof StepFooter>, "onBack" | "submitLabel" | "secondaryAction"> {
  const { t } = useTranslation();
  const confirm = useConfirm();

  if (mode === "wizard") return { onBack };

  return {
    submitLabel: t("Save"),
    secondaryAction: onCancel
      ? {
          label: t("Discard changes"),
          onClick: async () => {
            if (isDirty) {
              const ok = await confirm({
                title: t("Discard changes?"),
                description: t("Your edits to this section will be lost."),
                confirmText: t("Discard"),
              });
              if (!ok) return;
            }
            onCancel();
          },
        }
      : undefined,
  };
}
