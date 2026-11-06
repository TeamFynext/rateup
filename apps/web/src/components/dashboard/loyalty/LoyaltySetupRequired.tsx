import { IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { OnboardingState } from "@/backend/loyalty/onboarding.api";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";

import { LOYALTY_PATHS } from "./paths.ts";
import { buildProgramProgress } from "./program/programProgress.ts";

/**
 * What every loyalty screen shows in place of itself while the programme has not been set
 * up: what is missing, and the one button that fixes it. The wizard resumes where the
 * merchant left off, so a half-finished setup lands on the step it stopped at.
 */
export function LoyaltySetupRequired({ state }: Readonly<{ state: OnboardingState | undefined }>) {
  const { t } = useTranslation();
  const progress = buildProgramProgress(state);
  const started = Boolean(state?.program);
  const left = progress.leftCount;

  return (
    <Empty className="rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconRocket />
        </EmptyMedia>
        <EmptyTitle>
          {started ? t("Finish setting up your program") : t("Set up your loyalty program first")}
        </EmptyTitle>
        <EmptyDescription>
          {started
            ? left === 1
              ? t(
                  "One step left. This page starts working once the program is set up and activated.",
                )
              : t(
                  "{count} steps left. This page starts working once the program is set up and activated.",
                  { count: left },
                )
            : t(
                "There is no loyalty program yet. The setup takes about ten minutes, and nothing reaches customers until you activate it.",
              )}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          render={
            <Link
              to={LOYALTY_PATHS.onboarding}
              search={progress.nextStep ? { step: progress.nextStep } : {}}
            />
          }
        >
          <IconRocket size={16} />
          {started ? t("Continue setup") : t("Start setup")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
