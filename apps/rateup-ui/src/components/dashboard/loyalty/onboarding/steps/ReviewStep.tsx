import { IconAlertTriangle, IconRocket } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { OnboardingState } from "@/backend/loyalty/onboarding.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

import { calculateGiveback } from "../../giveback/calculateGiveback.ts";
import { GivebackPanel } from "../../giveback/GivebackPanel.tsx";
import type { GivebackContext } from "../givebackContext.ts";
import { StepHeader } from "../StepChrome.tsx";

interface ReviewStepProps {
  state: OnboardingState;
  giveback: GivebackContext;
  isActivating: boolean;
  /** Returned by a refused or completed activation; shown rather than toasted. */
  warnings: string[];
  onBack: () => void;
  onEditAverageOrderValue: () => void;
  onActivate: () => void;
}

export function ReviewStep({
  state,
  giveback,
  isActivating,
  warnings,
  onBack,
  onEditAverageOrderValue,
  onActivate,
}: Readonly<ReviewStepProps>) {
  const { t } = useTranslation();
  const { program, counts } = state;

  const summary = [
    { label: t("Earning rules"), value: counts.rules },
    { label: t("Tiers"), value: program?.tiersEnabled ? counts.tiers : t("Off") },
    { label: t("Rewards"), value: counts.rewards },
    { label: t("Keyword replies"), value: counts.commands },
    { label: t("Notifications"), value: counts.triggers },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StepHeader
        title={t("Ready to go live")}
        description={t(
          "Nothing has been sent to customers yet. Activating turns on point earning, keyword replies and notifications.",
        )}
      />

      <Card className="border-border">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-5">
          {summary.map((item) => (
            <div key={item.label}>
              <p className="text-xl font-semibold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Static here: nothing on this step is editable, so it reads straight off the
          saved programme rather than subscribing to a form. */}
      <GivebackPanel
        result={calculateGiveback(giveback)}
        currencySymbol={giveback.currencySymbol}
        currencyCode={giveback.currencyCode}
        pointsName={giveback.pointsName}
        averageOrderValue={giveback.averageOrderValue}
        onEditAverageOrderValue={onEditAverageOrderValue}
      />

      {warnings.length > 0 && (
        <Alert>
          <IconAlertTriangle />
          <AlertTitle>{t("Worth knowing before you launch")}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isActivating}>
          {t("Back")}
        </Button>
        <Button type="button" onClick={onActivate} disabled={isActivating}>
          <IconRocket size={16} />
          {isActivating ? t("Activating…") : t("Activate program")}
        </Button>
      </div>
    </div>
  );
}
