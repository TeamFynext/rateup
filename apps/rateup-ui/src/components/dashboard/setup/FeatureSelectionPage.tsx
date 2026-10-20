import { IconArrowLeft } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { subscriptionKeys } from "@/backend/campaign/campaign.keys";
import { useUpdateOrgDetailsMutation, useUpdateOrgModules } from "@/backend/org/org.query.tsx";
import { FeaturePicker, useFeatureDraft } from "@/components/dashboard/features/FeaturePicker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";

import { SETUP_PATH } from "./setup.tasks.ts";

/** The setup guide's "Choose features" step: every optional feature, explained, as a pick list. */
export function FeatureSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const saveModules = useUpdateOrgModules();
  const updateOrg = useUpdateOrgDetailsMutation({ showSuccessToast: false });
  const canEdit = can("org.settings");

  const { selected, hidden, toggle } = useFeatureDraft();

  const save = async () => {
    try {
      await saveModules.mutateAsync(hidden);
      await updateOrg.mutateAsync({ onboardingChecklist: { features: true } });
    } catch {
      return; // Both mutations toast their own failure.
    }
    void queryClient.invalidateQueries({ queryKey: subscriptionKeys.onboardingChecklist() });
    void navigate({ to: SETUP_PATH });
  };

  const saving = saveModules.isPending || updateOrg.isPending;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
          render={<Link to={SETUP_PATH} />}
        >
          <IconArrowLeft data-icon="inline-start" aria-hidden="true" />
          {t("Set up RateUp")}
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-7 pb-8">
        <div className="mx-auto flex max-w-265 flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="m-0 font-display text-[28px] leading-tight font-bold tracking-[-0.025em]">
              {t("Which features will you use?")}
            </h1>
            <p className="m-0 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
              {t(
                "Pick the ones your business needs and we will keep the rest out of your menu. Nothing is locked: you can change this any time from Features in the menu.",
              )}
            </p>
          </div>

          <FeaturePicker selected={selected} onToggle={toggle} canEdit={canEdit} />
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t bg-card px-6 py-3">
        <span className="text-sm text-muted-foreground">
          {t("{count, plural, one {# feature selected} other {# features selected}}", {
            count: selected.size,
          })}
        </span>
        <Button loading={saving} disabled={!canEdit} onClick={() => void save()}>
          {t("Save and continue")}
        </Button>
      </footer>
    </div>
  );
}
