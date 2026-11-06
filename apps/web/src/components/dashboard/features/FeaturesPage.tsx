import { Button } from "@rateup/ui/components/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useUpdateOrgModules } from "@/backend/org/org.query.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";

import { FeaturePicker, useFeatureDraft } from "./FeaturePicker.tsx";

export function FeaturesPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const update = useUpdateOrgModules();
  const { selected, hidden, dirty, toggle, reset } = useFeatureDraft();
  const canEdit = can("org.settings");

  const save = () =>
    update.mutate(hidden, {
      onSuccess: () => {
        reset();
        toast.success(t("Your features are saved"));
      },
    });

  return (
    <div className="mx-auto flex min-h-full w-full max-w-265 flex-col">
      <div className="flex flex-1 flex-col gap-6 pt-3 pb-8">
        <div className="flex flex-col gap-3">
          <h1 className="m-0 font-display text-[28px] leading-tight font-bold tracking-[-0.025em]">
            {canEdit ? t("Which features will you use?") : t("What RateUp offers")}
          </h1>
          <p className="m-0 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
            {canEdit
              ? t(
                  "Pick the ones your business needs and we will keep the rest out of your menu for everyone. Turning a feature off deletes nothing and stops nothing you set up in it.",
                )
              : t("Everything RateUp can do for your business, and which of it your team has on.")}
          </p>
        </div>

        <FeaturePicker selected={selected} onToggle={toggle} canEdit={canEdit} />
      </div>

      {/* Pinned to the scroller's foot, flush with the shell's p-4 gutter. */}
      {canEdit && (
        <footer className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-between gap-3 border-t bg-card px-6 py-3">
          <span className="text-sm text-muted-foreground">
            {t("{count, plural, one {# feature selected} other {# features selected}}", {
              count: selected.size,
            })}
          </span>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button variant="ghost" disabled={update.isPending} onClick={reset}>
                {t("Discard")}
              </Button>
            )}
            <Button loading={update.isPending} disabled={!dirty} onClick={save}>
              {t("Save changes")}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
