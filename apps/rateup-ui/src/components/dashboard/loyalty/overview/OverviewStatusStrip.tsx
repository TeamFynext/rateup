import { IconArrowRight, IconCircleFilled } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { LoyaltyDashboardStats } from "@/backend/loyalty/dashboard/dashboard.query";
import type { LoyaltyProgram } from "@/backend/loyalty/program.api";
import { formatIsoDateString } from "@/utils/dateTime.ts";

import type { GivebackResult } from "../giveback/calculateGiveback";
import { formatPercent } from "../giveback/format";
import { LOYALTY_PATHS } from "../paths.ts";
import type { ProgramState } from "../program/programState.ts";

/** One line under the heading: where the programme stands, in four short facts. */
export function OverviewStatusStrip({
  programState,
  program,
  dashboard,
  giveback,
  templatesPending,
}: Readonly<{
  programState: ProgramState;
  program: LoyaltyProgram | null;
  dashboard: LoyaltyDashboardStats | undefined;
  giveback: GivebackResult;
  templatesPending: number;
}>) {
  const { t } = useTranslation();
  const pct = giveback.givebackPctTop ?? giveback.givebackPct;

  const status =
    programState === "live"
      ? {
          dot: "text-green-600 dark:text-green-500",
          label: program?.onboardingCompletedAt
            ? t("Live since {date}", { date: formatIsoDateString(program.onboardingCompletedAt) })
            : t("Live"),
        }
      : programState === "paused"
        ? { dot: "text-amber-600 dark:text-amber-500", label: t("Earning paused") }
        : { dot: "text-muted-foreground/60", label: t("Draft — nothing has reached customers") };

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <IconCircleFilled className={`size-2.5 ${status.dot}`} />
        {status.label}
      </span>
      {programState !== "draft" && dashboard && (
        <span>
          {t("{count} members", { count: dashboard.metrics.totalMembers.toLocaleString() })}
        </span>
      )}
      {pct !== null && <span>{t("Giveback {pct} of revenue", { pct: formatPercent(pct) })}</span>}
      {templatesPending > 0 && (
        <Link
          to={LOYALTY_PATHS.messages}
          search={{ tab: "templates" }}
          className="inline-flex items-center gap-1 font-medium text-amber-700 underline-offset-4 hover:underline dark:text-amber-500"
        >
          {t("{count} templates awaiting Meta", { count: templatesPending })}
          <IconArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}
