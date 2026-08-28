import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";

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

/** Back / continue pair. `submitLabel` is only overridden on the final step. */
export function StepFooter({
  isSaving,
  onBack,
  submitLabel,
  extra,
}: Readonly<{
  isSaving: boolean;
  onBack?: () => void;
  submitLabel?: string;
  extra?: React.ReactNode;
}>) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack} disabled={isSaving}>
            {t("Back")}
          </Button>
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
