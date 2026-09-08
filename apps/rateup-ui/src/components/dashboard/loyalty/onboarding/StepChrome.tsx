import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { useConfirm } from "@/context/confirm-provider";

/**
 * The five step forms are mounted by two screens: the setup wizard (Back / Continue, the
 * cost panel inline under the fields) and the Program page's section editors (Discard /
 * Save, the cost panel in a rail beside the fields, updating as you type). `mode` is the
 * only thing that differs; everything a step knows about its own fields is the same.
 */
export type StepMode = "wizard" | "section";

/** Title and lead-in copy, so every step reads the same way. */
export function StepHeader({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
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
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-4">{aside}</aside>
    </div>
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
