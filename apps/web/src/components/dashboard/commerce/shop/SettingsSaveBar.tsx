import { Button } from "@rateup/ui/components/button";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/** The one Save for a settings tab, pinned to the bottom of the viewport while it scrolls. */
export function SettingsSaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  disabled,
}: Readonly<{
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  disabled?: boolean;
}>) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-md transition-opacity",
        !dirty && !saving && "opacity-90 shadow-none",
      )}
    >
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {dirty ? t("You have unsaved changes") : t("All changes saved")}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!dirty || saving}
          onClick={onDiscard}
        >
          {t("Discard")}
        </Button>
        <Button
          type="button"
          size="sm"
          loading={saving}
          disabled={!dirty || disabled}
          onClick={onSave}
        >
          {t("Save changes")}
        </Button>
      </div>
    </div>
  );
}
