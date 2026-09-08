import { IconArrowRight, IconRocket } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useLoyaltyDashboardData } from "@/backend/loyalty/dashboard/dashboard.api";
import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
} from "@/backend/loyalty/dashboard/dashboard.query";
import { useLoyaltyOnboardingState } from "@/backend/loyalty/onboarding.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Loader } from "@/components/ui/loader.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import { GivebackPanel } from "../giveback/GivebackPanel.tsx";
import { useGivebackResult } from "../giveback/useGivebackResult.ts";
import { LOYALTY_PATHS } from "../paths.ts";
import { buildProgramProgress } from "../program/programProgress.ts";
import { programStateOf } from "../program/programState.ts";
import { DraftStepsCard } from "./DraftStepsCard.tsx";
import { buildMetricTiles } from "./metricTiles.ts";
import { MetricTiles } from "./MetricTiles.tsx";
import { OverviewCharts } from "./OverviewCharts.tsx";
import { OverviewStatusStrip } from "./OverviewStatusStrip.tsx";
import { RecentActivity } from "./RecentActivity.tsx";
import { buildSuggestions } from "./suggestions.ts";
import { SuggestionsCard } from "./SuggestionsCard.tsx";

/**
 * The loyalty Overview. The layout is the same whether the programme is a draft or live;
 * a draft fills it with the truth ("starts counting when you activate") and carries the
 * remaining setup steps, with the giveback estimate still live because it is the one
 * figure that works before launch.
 */
export function OverviewPage({ period }: Readonly<{ period: DashboardPeriod }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: state, isLoading: stateLoading } = useLoyaltyOnboardingState();
  const { data: dashboard, isLoading: dashboardLoading } = useLoyaltyDashboardData(period);
  const { data: waSettings } = useWaSettings();
  const { result: giveback, context } = useGivebackResult();

  const program = state?.program ?? null;
  const programState = programStateOf(program);
  const pointsName = program?.currencyName ?? context.pointsName;
  const hasWhatsappChannel = Boolean(waSettings?.length);
  const templatesPending = state?.counts.templatesPending ?? 0;
  const progress = useMemo(() => buildProgramProgress(state), [state]);

  const tiles = useMemo(
    () =>
      buildMetricTiles({
        t,
        programState,
        pointsName,
        currencySymbol: context.currencySymbol,
        currencyCode: context.currencyCode,
        dashboard,
        giveback,
      }),
    [
      t,
      programState,
      pointsName,
      context.currencySymbol,
      context.currencyCode,
      dashboard,
      giveback,
    ],
  );

  const suggestions = useMemo(
    () =>
      state
        ? buildSuggestions({
            t,
            programState,
            pointsName,
            state,
            dashboard,
            giveback,
            progress,
            templatesPending,
            hasWhatsappChannel,
          })
        : [],
    [
      t,
      state,
      programState,
      pointsName,
      dashboard,
      giveback,
      progress,
      templatesPending,
      hasWhatsappChannel,
    ],
  );

  if (stateLoading || !state) return <Loader />;

  const periodItems = DASHBOARD_PERIODS.map((key) => ({
    value: key,
    label:
      key === "30d" ? t("Last 30 days") : key === "90d" ? t("Last 90 days") : t("Last 12 months"),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={t("Overview")}
        description={
          program
            ? `${program.name} · ${pointsName}${programState === "draft" ? ` · ${t("draft")}` : ""}`
            : undefined
        }
        actions={
          programState !== "draft" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={period}
                items={periodItems}
                onValueChange={(value) =>
                  navigate({
                    to: LOYALTY_PATHS.overview,
                    search: { period: (value ?? "30d") as DashboardPeriod },
                    replace: true,
                  })
                }
              >
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dashboard && (
                <span className="text-xs text-muted-foreground">
                  {dashboard.period.comparisonLabel}
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      <OverviewStatusStrip
        programState={programState}
        program={program}
        dashboard={dashboard}
        giveback={giveback}
        templatesPending={templatesPending}
      />

      {programState === "paused" && (
        <Alert>
          <IconRocket />
          <AlertTitle>{t("Earning is paused — balances are safe")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {t(
                "Nobody is earning or being messaged while this is off. Every {points} already issued is still there, and staff can still redeem rewards at the counter.",
                { points: pointsName },
              )}
            </span>
            <Button size="sm" variant="outline" render={<Link to={LOYALTY_PATHS.settings} />}>
              {t("Resume in Settings")} <IconArrowRight size={14} />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {programState === "draft" && <DraftStepsCard progress={progress} state={state} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <GivebackPanel
          result={giveback}
          currencySymbol={context.currencySymbol}
          currencyCode={context.currencyCode}
          pointsName={pointsName}
          averageOrderValue={context.averageOrderValue}
          title={
            programState === "draft"
              ? t("Your program would give back")
              : t("Your program gives back")
          }
          hint={
            programState !== "draft" && dashboard?.metrics.actualGivebackPct.current != null
              ? t("Modelled at the best reward. This period you actually gave back {actual}.", {
                  actual: `${dashboard.metrics.actualGivebackPct.current.toFixed(1)}%`,
                })
              : programState === "draft"
                ? t(
                    "Estimated from your typical spend — the one number here that works before you go live.",
                  )
                : undefined
          }
          onEditAverageOrderValue={() =>
            navigate({ to: LOYALTY_PATHS.program, search: { section: "basics" } })
          }
        />
        <SuggestionsCard suggestions={suggestions} />
      </div>

      <MetricTiles tiles={tiles} isLoading={programState !== "draft" && dashboardLoading} />

      <OverviewCharts programState={programState} dashboard={dashboard} pointsName={pointsName} />

      <RecentActivity programState={programState} dashboard={dashboard} pointsName={pointsName} />
    </div>
  );
}
