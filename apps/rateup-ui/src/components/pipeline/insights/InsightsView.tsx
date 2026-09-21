import {
  IconAlertTriangle,
  IconClock,
  IconTrophy,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { usePipelineStatsQuery } from "@/backend/pipeline/pipeline.query.tsx";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { SOURCE_META } from "../pipeline.constants.tsx";
import { sourceLabel } from "../pipeline.labels.ts";
import { buildFunnel, buildSourceRows, buildStallRows } from "../pipeline.utils.ts";
import { StageDot } from "../shared/atoms.tsx";
import { LeadAvatar } from "../shared/LeadAvatar.tsx";
import type { PipelineData } from "../usePipelineData.ts";

function KpiCard({
  icon: KpiIcon,
  tone,
  value,
  label,
  note,
  noteTone,
}: Readonly<{
  icon: Icon;
  tone: string;
  value: string;
  label: string;
  note: string;
  /** Colours the note when it is itself a warning, rather than a plain aside. */
  noteTone?: string;
}>) {
  return (
    <Card className="gap-0 px-5 py-4.5 shadow-xs">
      <span className={cn("mb-2.5 flex size-7.5 items-center justify-center rounded-md", tone)}>
        <KpiIcon className="size-4" />
      </span>
      <div className="font-display text-foreground text-[30px] leading-none font-bold tracking-[-0.02em] tabular-nums">
        {value}
      </div>
      <div className="text-muted-foreground mt-1.25 text-xs">{label}</div>
      <div className={cn("mt-2 text-[11px] font-bold", noteTone ?? "text-muted-foreground")}>
        {note}
      </div>
    </Card>
  );
}

function PanelHeading({ title, subtitle }: Readonly<{ title: string; subtitle?: string }>) {
  return (
    <div className="mb-4.5">
      <div className="font-display text-foreground text-[15px] font-semibold">{title}</div>
      {subtitle ? <div className="text-muted-foreground text-xs">{subtitle}</div> : null}
    </div>
  );
}

/**
 * A thin horizontal bar. `color` paints it in an org-chosen stage hex, which has
 * no class; `fillClassName` paints it from the palette. Pass one or the other.
 */
function Meter({
  percent,
  color,
  fillClassName,
}: Readonly<{ percent: number; color?: string | null; fillClassName?: string }>) {
  return (
    <div className="bg-secondary h-2 overflow-hidden rounded-full">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          fillClassName ?? "bg-primary",
        )}
        style={{ width: `${percent}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}

/**
 * The pipeline's health in four panels: how leads narrow through the funnel,
 * where they stall, where they come from, and how each assignee is doing.
 *
 * Every figure is counted on the server over the whole board, so none of it
 * depends on which cards a column happens to have loaded — and none of it moves
 * when the board's filters do. This answers "how is this pipeline doing", not
 * "how is it doing under the filter I left on".
 */
export function InsightsView({ data }: Readonly<{ data: PipelineData }>) {
  const { t } = useTranslation();
  const { pipeline } = data;
  const { data: stats, isPending } = usePipelineStatsQuery(pipeline?.id);

  if (!pipeline) return null;

  if (isPending || !stats) {
    return (
      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        <div className="mb-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((card) => (
            <Skeleton key={card} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const rottingEnabled = pipeline.rottingEnabled;
  const { totals } = stats;
  const closedCount = totals.won + totals.lost;

  const winRate = closedCount ? Math.round((totals.won / closedCount) * 100) : null;
  // How long a won lead took end to end, which is the number worth watching —
  // average time in stage told you how slow the board is, not how long a sale
  // takes. Null rather than 0 when nothing has been won: there is no cycle yet.
  const cycleDays = totals.avgCycleDays;
  const noNextActivity = totals.noactivity;

  const counts = new Map(
    stats.stages.map((row) => [
      row.stageId,
      { total: row.total, open: row.open, rotting: row.rotting },
    ]),
  );

  const funnel = buildFunnel(pipeline.stages, counts);
  const stalls = buildStallRows(pipeline.stages, counts);
  const sources = buildSourceRows(stats.sources);
  const assignees = stats.assignees.map((row) => ({
    ...row,
    winRate: row.closed === 0 ? null : Math.round((row.won / row.closed) * 100),
  }));

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <div className="mb-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={IconUsers}
          tone="bg-primary/10 text-primary"
          value={String(totals.open)}
          label={t("Leads in pipeline")}
          note={t("across {total} lead stages", { total: pipeline.stages.length })}
        />
        <KpiCard
          icon={IconTrophy}
          tone="bg-green-600/10 text-green-700 dark:text-green-500"
          value={winRate === null ? "—" : t("{percent}%", { percent: winRate })}
          label={t("Win rate")}
          note={t("{won} won · {lost} lost", { won: totals.won, lost: totals.lost })}
        />
        <KpiCard
          icon={IconClock}
          tone="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-500"
          value={cycleDays === null ? "—" : t("{days}d", { days: cycleDays })}
          label={t("Average time to win")}
          // The design shows a fixed "target 21d" here; there is no target in the
          // data, so this says what the average is actually drawn from instead of
          // inventing a goal.
          note={
            cycleDays === null
              ? t("Nothing won yet")
              : t("across {total} won leads", { total: totals.won })
          }
        />
        <KpiCard
          icon={IconAlertTriangle}
          tone="bg-destructive/10 text-destructive"
          value={String(totals.rotting)}
          label={t("Stalled leads")}
          note={
            rottingEnabled
              ? t("{total} with no next activity", { total: noNextActivity })
              : t("Rotting checks are off")
          }
          noteTone={rottingEnabled && noNextActivity > 0 ? "text-destructive" : undefined}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-5 shadow-xs">
          <PanelHeading
            title={t("Conversion funnel")}
            subtitle={t("Leads currently at each stage")}
          />
          <div className="flex flex-col gap-3">
            {funnel.map((row) => (
              <div key={row.stage.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-foreground flex min-w-0 items-center gap-2 text-xs">
                    <StageDot color={row.stage.color} />
                    <span className="truncate">{row.stage.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5">
                    {/* Losing more than a third of a stage is the thing to notice,
                        so the label turns only past that. */}
                    <span
                      className={cn(
                        "text-[11px] font-bold",
                        row.carried !== null && row.carried < 70
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {row.carried === null
                        ? t("entry")
                        : t("{percent}% carried", { percent: row.carried })}
                    </span>
                    <span className="text-foreground text-[13px] font-semibold">{row.count}</span>
                  </span>
                </div>
                <div className="bg-secondary h-5.5 overflow-hidden rounded-sm">
                  <div
                    className="bg-primary h-full rounded-sm transition-[width] duration-300"
                    style={{
                      width: `${row.width}%`,
                      ...(row.stage.color ? { backgroundColor: row.stage.color } : {}),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-xs">
          <PanelHeading
            title={t("Where leads stall")}
            subtitle={t("Idle beyond the stage rotting limit")}
          />
          {stalls.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              {t("No lead stage has a rotting window set.")}
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {/* Healthy stages stay listed and read green. Dropping them left a
                  clean board rendering as an empty panel, which looks like
                  missing data rather than good news. */}
              {stalls.map((row) => {
                const healthy = row.stalled === 0;
                return (
                  <div key={row.stage.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-foreground min-w-0 truncate text-xs">
                        {row.stage.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-xs font-bold",
                          healthy ? "text-green-700 dark:text-green-500" : "text-destructive",
                        )}
                      >
                        {healthy
                          ? t("all healthy")
                          : t("{stalled} of {total} idle over {days}d", {
                              stalled: row.stalled,
                              total: row.inStage,
                              days: row.stage.rottingDays,
                            })}
                      </span>
                    </div>
                    {/* A healthy stage still gets a sliver, so the row reads as a
                        measured zero rather than a bar that failed to render. */}
                    <Meter
                      percent={healthy ? 4 : row.width}
                      fillClassName={healthy ? "bg-green-600 dark:bg-green-500" : "bg-destructive"}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-xs">
          <PanelHeading title={t("Leads by source")} />
          <div className="flex flex-col gap-3.75">
            {sources.map((row) => {
              const meta = SOURCE_META[row.source];
              const SourceIcon = meta.icon;
              return (
                <div key={row.source}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-foreground flex min-w-0 items-center gap-2 text-[13px]">
                      {/* A filled tile rather than a bare icon: it ties the row to
                          its bar, which carries the same colour. */}
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-sm text-white",
                          meta.fillClassName,
                        )}
                      >
                        <SourceIcon className="size-3" />
                      </span>
                      <span className="truncate">{sourceLabel(t, row.source)}</span>
                    </span>
                    <span className="text-foreground shrink-0 text-[13px] font-bold">
                      {row.count}
                    </span>
                  </div>
                  <Meter percent={row.width} fillClassName={meta.fillClassName} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 shadow-xs">
          <PanelHeading title={t("Assignee performance")} />
          <div className="border-border flex items-center border-b pb-2.5">
            <span className="text-muted-foreground flex-1 text-[11.5px] font-semibold tracking-[0.04em] uppercase">
              {t("Assignee")}
            </span>
            {/* "Win rate" and "Stalled" get the wider columns — they are the two
                headings that would otherwise wrap. */}
            {[
              { key: "open", label: t("Open"), width: "w-15" },
              { key: "won", label: t("Won"), width: "w-15" },
              { key: "winRate", label: t("Win rate"), width: "w-17.5" },
              { key: "stalled", label: t("Stalled"), width: "w-17.5" },
            ].map((heading) => (
              <span
                key={heading.key}
                className={cn(
                  "text-muted-foreground shrink-0 text-right text-[11.5px] font-semibold tracking-[0.04em] uppercase",
                  heading.width,
                )}
              >
                {heading.label}
              </span>
            ))}
          </div>
          {assignees.map((row) => {
            // A row with no id is the unassigned bucket; one with an id but no
            // name is a teammate who has not set one.
            const name = row.name ?? (row.assigneeId ? t("Teammate") : t("Unassigned"));
            return (
              <div
                key={row.assigneeId ?? "unassigned"}
                className="border-border/60 flex items-center border-b py-2.75 last:border-b-0"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <LeadAvatar
                    name={name}
                    tone="person"
                    colorKey={row.assigneeId ?? undefined}
                    size="md"
                  />
                  <span className="text-foreground truncate text-[13px] font-semibold">{name}</span>
                </span>
                <span className="text-foreground w-15 shrink-0 text-right text-[13px] font-bold">
                  {row.open}
                </span>
                <span className="text-muted-foreground w-15 shrink-0 text-right text-[13px]">
                  {row.won}
                </span>
                <span
                  className={cn(
                    "w-17.5 shrink-0 text-right text-[13px] font-bold",
                    row.winRate !== null && row.winRate >= 50
                      ? "text-green-700 dark:text-green-500"
                      : "text-foreground",
                  )}
                >
                  {row.winRate === null ? "—" : t("{percent}%", { percent: row.winRate })}
                </span>
                {/* An em dash rather than a 0: a row with nothing stuck should not
                    draw the eye the way a number does. */}
                <span
                  className={cn(
                    "w-17.5 shrink-0 text-right text-[13px] font-bold",
                    row.stalled > 0 ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {row.stalled > 0 ? row.stalled : "—"}
                </span>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
