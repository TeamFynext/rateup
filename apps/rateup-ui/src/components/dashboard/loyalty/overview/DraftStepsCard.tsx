import { IconCircleCheckFilled, IconCircle, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { OnboardingState } from "@/backend/loyalty/onboarding.api";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

import { LOYALTY_PATHS } from "../paths.ts";
import type { ProgramProgress, ProgramStepId } from "../program/programProgress.ts";

/**
 * While the programme is a draft the Overview carries the remaining setup steps; there is
 * no separate "Setup Guide" entry any more — the wizard is the guide.
 */
export function DraftStepsCard({
  progress,
  state,
}: Readonly<{ progress: ProgramProgress; state: OnboardingState }>) {
  const { t } = useTranslation();
  const labels: Record<ProgramStepId, string> = {
    basics: t("Basics"),
    earning: t("Earning"),
    tiers: t("Tiers"),
    rewards: t("Rewards"),
    messages: t("Messages"),
    review: t("Review"),
  };
  const hints: Partial<Record<ProgramStepId, string>> = {
    messages: state.counts.triggers === 0 ? t("{count} to write", { count: 2 }) : undefined,
  };
  const left = progress.leftCount;

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">
              {left === 1
                ? t("One step left, then you can go live")
                : t("{count} steps left, then you can go live", { count: left })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(
                "Everything you have saved is kept. Points start moving the moment you activate — nothing sends before that.",
              )}
            </p>
          </div>
          <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {progress.steps.map((step) => (
              <li key={step.id} className="inline-flex items-center gap-1.5">
                {step.done ? (
                  <IconCircleCheckFilled className="size-4 text-green-600 dark:text-green-500" />
                ) : (
                  <IconCircle className="size-4 text-muted-foreground/50" />
                )}
                <span className={step.done ? "text-foreground" : "text-muted-foreground"}>
                  {labels[step.id]}
                  {!step.done && hints[step.id] ? ` — ${hints[step.id]}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <Button
          className="shrink-0"
          render={
            <Link
              to={LOYALTY_PATHS.onboarding}
              search={progress.nextStep ? { step: progress.nextStep } : {}}
            />
          }
        >
          <IconRocket size={16} />
          {progress.doneCount === 0 ? t("Start setup") : t("Continue setup")}
        </Button>
      </CardContent>
    </Card>
  );
}
