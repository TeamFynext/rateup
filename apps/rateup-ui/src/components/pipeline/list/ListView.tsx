import {
  IconCalendarX,
  IconChevronDown,
  IconChevronRight,
  IconMinus,
  IconRosetteDiscountCheck,
  IconLayoutRows,
  IconTrophy,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Lead, PipelineStage } from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { TASK_TYPE_ICON } from "../pipeline.constants.tsx";
import { daysIdle, daysInStage, isOverdue, isRotting, leadAgeDays } from "../pipeline.utils.ts";
import { AssigneeStack } from "../shared/AssigneeStack.tsx";
import { StageDot } from "../shared/atoms.tsx";
import { LeadAvatar } from "../shared/LeadAvatar.tsx";
import type { PipelineData } from "../usePipelineData.ts";

interface ListViewProps {
  data: PipelineData;
  onOpenLead: (leadId: string) => void;
  onBulkMove: (leadIds: string[], stage: PipelineStage) => void;
  onBulkAssign: (leadIds: string[], assigneeIds: string[]) => void;
}

interface LeadGroup {
  key: string;
  label: string;
  color: string | null;
  /** The stage that closes a lead won; marked so the list reads like the board. */
  isWon?: boolean;
  leads: Lead[];
}

/**
 * Column widths, shared by the header, the rows and the summary footer.
 *
 * All of them are hidden below `lg`: seven columns need about 1040px, and a phone
 * scrolling sideways through them is worse than a stacked row. Each row then
 * shows the lead plus a summary line (see `RowSummary`), and the wide table comes
 * back intact from `lg` up. These strings are always the last argument to `cn`,
 * so their `hidden` wins the display conflict against a call site's `flex`.
 */
const COLUMN = {
  stage: "hidden w-38 shrink-0 lg:flex",
  lifecycle: "hidden w-28 shrink-0 lg:block",
  assignees: "hidden w-33 shrink-0 lg:flex",
  next: "hidden w-42 shrink-0 lg:flex",
  stageAge: "hidden w-21 shrink-0 text-right lg:block",
  age: "hidden w-18 shrink-0 text-right lg:block",
} as const;

function HeaderCell({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <span
      className={cn(
        "text-muted-foreground text-[10px] font-extrabold tracking-[0.06em] uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ListView({ data, onOpenLead, onBulkMove, onBulkAssign }: Readonly<ListViewProps>) {
  const { t } = useTranslation();
  const { pipeline, visibleLeads, members } = data;
  const [grouped, setGrouped] = useState(true);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const groups: LeadGroup[] = useMemo(() => {
    if (!pipeline) return [];
    if (!grouped) {
      return [{ key: "all", label: t("All leads"), color: null, leads: visibleLeads }];
    }
    return pipeline.stages
      .map((stage) => ({
        key: stage.id,
        label: stage.name,
        color: stage.color,
        isWon: stage.isWon,
        leads: visibleLeads.filter((lead) => lead.stageId === stage.id),
      }))
      .filter((group) => group.leads.length > 0);
  }, [pipeline, visibleLeads, grouped, t]);

  if (!pipeline) return null;

  const allIds = visibleLeads.map((lead) => lead.id);
  const allSelected = allIds.length > 0 && selected.length === allIds.length;

  const toggleSelected = (leadId: string) =>
    setSelected((previous) =>
      previous.includes(leadId) ? previous.filter((id) => id !== leadId) : [...previous, leadId],
    );

  const openCount = visibleLeads.filter((lead) => lead.status === "OPEN").length;
  const missingNext = visibleLeads.filter(
    (lead) => lead.status === "OPEN" && !lead.nextTask,
  ).length;
  const averageStageAge = visibleLeads.length
    ? Math.round(
        visibleLeads.reduce((total, lead) => total + daysInStage(lead), 0) / visibleLeads.length,
      )
    : 0;
  const averageAge = visibleLeads.length
    ? Math.round(
        visibleLeads.reduce((total, lead) => total + leadAgeDays(lead), 0) / visibleLeads.length,
      )
    : 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="border-border flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-6">
        <span className="text-muted-foreground text-[13px]">
          {t("{total} leads · {open} open", { total: visibleLeads.length, open: openCount })}
        </span>
        <Button
          variant={grouped ? "secondary" : "outline"}
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setGrouped((previous) => !previous)}
        >
          <IconLayoutRows className="size-3.5" />
          {t("Group by stage")}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-6 sm:px-6">
        <div className="bg-card border-border mt-4 overflow-hidden rounded-xl border lg:min-w-260">
          <div className="bg-muted border-border flex items-center gap-3 border-b px-4 py-2.5">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => setSelected(checked ? allIds : [])}
              aria-label={t("Select all leads")}
            />
            <HeaderCell className="min-w-0 flex-1">{t("Lead")}</HeaderCell>
            <HeaderCell className={COLUMN.stage}>{t("Stage")}</HeaderCell>
            <HeaderCell className={COLUMN.lifecycle}>{t("Lifecycle")}</HeaderCell>
            <HeaderCell className={COLUMN.assignees}>{t("Assignees")}</HeaderCell>
            <HeaderCell className={COLUMN.next}>{t("Next activity")}</HeaderCell>
            <HeaderCell className={COLUMN.stageAge}>{t("In stage")}</HeaderCell>
            <HeaderCell className={COLUMN.age}>{t("Age")}</HeaderCell>
          </div>

          {groups.map((group) => {
            const isCollapsed = collapsed.includes(group.key);
            const ChevronIcon = isCollapsed ? IconChevronRight : IconChevronDown;

            return (
              <div key={group.key}>
                {grouped ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((previous) =>
                        previous.includes(group.key)
                          ? previous.filter((key) => key !== group.key)
                          : [...previous, group.key],
                      )
                    }
                    className="bg-background hover:bg-muted/60 border-border flex w-full items-center gap-2.5 border-b px-4 py-2.5 text-left transition-colors"
                  >
                    <ChevronIcon className="text-muted-foreground size-3.5" />
                    <StageDot color={group.color} />
                    <span className="font-nunito text-foreground text-xs font-extrabold">
                      {group.label}
                    </span>
                    {group.isWon ? (
                      <IconTrophy
                        className="size-3.5 text-green-700 dark:text-green-500"
                        title={t("Leads in this stage are marked won")}
                      />
                    ) : null}
                    <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] font-bold">
                      {group.leads.length}
                    </span>
                  </button>
                ) : null}

                {isCollapsed
                  ? null
                  : group.leads.map((lead) => {
                      const rotting = isRotting(lead, pipeline.rottingEnabled);
                      const overdue = isOverdue(lead);
                      const stage = pipeline.stages.find(
                        (candidate) => candidate.id === lead.stageId,
                      );
                      const NextIcon =
                        lead.status !== "OPEN"
                          ? lead.status === "WON"
                            ? IconRosetteDiscountCheck
                            : IconMinus
                          : lead.nextTask
                            ? TASK_TYPE_ICON[lead.nextTask.type]
                            : IconCalendarX;

                      return (
                        <div
                          key={lead.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => onOpenLead(lead.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") onOpenLead(lead.id);
                          }}
                          className={cn(
                            "border-border/60 hover:bg-muted/50 flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 transition-colors",
                            selected.includes(lead.id) && "bg-primary/5",
                          )}
                        >
                          <span onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selected.includes(lead.id)}
                              onCheckedChange={() => toggleSelected(lead.id)}
                              aria-label={t("Select {name}", { name: lead.name })}
                            />
                          </span>

                          <span className="flex min-w-0 flex-1 items-center gap-2.5">
                            <LeadAvatar name={lead.name} channel={lead.channel} />
                            <span className="min-w-0">
                              <span className="text-foreground block truncate text-[13px] font-bold">
                                {lead.name}
                              </span>
                              <span className="text-muted-foreground block truncate text-[11px]">
                                {lead.company ?? t("Direct customer")}
                              </span>
                              {/* Stands in for the columns that fold away below
                                  `lg` — stage, next step and how long it has sat. */}
                              <span className="text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate text-[11px] lg:hidden">
                                <StageDot color={stage?.color ?? null} className="size-1.5" />
                                {lead.stage.name}
                                <span className="bg-border h-2.5 w-px" />
                                <span className={cn(overdue && "text-destructive font-semibold")}>
                                  {lead.status !== "OPEN"
                                    ? lead.status === "WON"
                                      ? t("Won")
                                      : t("Lost")
                                    : (lead.nextTask?.title ?? t("No next step"))}
                                </span>
                                <span className="bg-border h-2.5 w-px" />
                                <span className={cn(rotting && "text-destructive font-semibold")}>
                                  {rotting
                                    ? t("{days}d idle", { days: daysIdle(lead) })
                                    : t("{days}d", { days: daysInStage(lead) })}
                                </span>
                              </span>
                            </span>
                          </span>

                          <span className={cn("flex items-center gap-1.5", COLUMN.stage)}>
                            <StageDot color={stage?.color ?? null} className="size-1.5" />
                            <span className="text-foreground truncate text-xs font-medium">
                              {lead.status === "LOST"
                                ? t("{stage} (lost)", { stage: lead.stage.name })
                                : lead.stage.name}
                            </span>
                          </span>

                          <span className={COLUMN.lifecycle}>
                            {stage?.lifecycle ? (
                              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-bold">
                                {stage.lifecycle.emoji} {stage.lifecycle.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </span>

                          <span className={cn("flex items-center gap-2", COLUMN.assignees)}>
                            {lead.assignees.length > 0 ? (
                              <>
                                <AssigneeStack assignees={lead.assignees} max={2} />
                                <span className="min-w-0">
                                  <span className="text-foreground block truncate text-xs">
                                    {lead.assignees.length === 1
                                      ? lead.assignees[0].name
                                      : t("{total} assignees", { total: lead.assignees.length })}
                                  </span>
                                  <span className="text-muted-foreground block text-[10px]">
                                    {lead.team?.name ?? t("No team")}
                                  </span>
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">
                                {t("Unassigned")}
                              </span>
                            )}
                          </span>

                          <span
                            className={cn(
                              "flex items-center gap-1.5 text-xs",
                              COLUMN.next,
                              lead.status !== "OPEN"
                                ? "text-muted-foreground"
                                : overdue
                                  ? "text-destructive font-semibold"
                                  : lead.nextTask
                                    ? "text-foreground"
                                    : "font-semibold text-amber-700 dark:text-amber-500",
                            )}
                          >
                            <NextIcon className="size-3.5 shrink-0" />
                            <span className="truncate">
                              {lead.status !== "OPEN"
                                ? "—"
                                : (lead.nextTask?.title ?? t("None scheduled"))}
                            </span>
                          </span>

                          <span
                            className={cn(
                              "text-xs font-bold",
                              COLUMN.stageAge,
                              rotting ? "text-destructive" : "text-foreground",
                            )}
                          >
                            {rotting
                              ? t("{days}d idle", { days: daysIdle(lead) })
                              : t("{days}d", { days: daysInStage(lead) })}
                          </span>

                          <span className={cn("text-muted-foreground text-xs", COLUMN.age)}>
                            {t("{days}d", { days: leadAgeDays(lead) })}
                          </span>
                        </div>
                      );
                    })}
              </div>
            );
          })}

          {visibleLeads.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              {t("No leads match these filters.")}
            </div>
          ) : (
            <div className="bg-muted sticky bottom-0 flex items-center gap-3 px-4 py-3">
              <span className="w-4 shrink-0" />
              <span className="text-foreground min-w-0 flex-1 text-xs font-extrabold">
                {t("{total} leads", { total: visibleLeads.length })}
              </span>
              <span className={cn("text-muted-foreground text-xs", COLUMN.stage)}>
                {t("{total} stages", { total: groups.length })}
              </span>
              <span className={cn("text-muted-foreground text-xs", COLUMN.lifecycle)} />
              <span className={cn("text-muted-foreground text-xs", COLUMN.assignees)}>
                {t("{total} assignees", {
                  total: new Set(visibleLeads.flatMap((lead) => lead.assignees.map((u) => u.id)))
                    .size,
                })}
              </span>
              <span className={cn("text-destructive text-xs font-bold", COLUMN.next)}>
                {t("{total} without a next step", { total: missingNext })}
              </span>
              <span className={cn("text-foreground text-xs font-extrabold", COLUMN.stageAge)}>
                {t("{days}d", { days: averageStageAge })}
              </span>
              <span className={cn("text-foreground text-xs font-extrabold", COLUMN.age)}>
                {t("{days}d", { days: averageAge })}
              </span>
            </div>
          )}
        </div>
      </div>

      {selected.length > 0 ? (
        <div className="bg-foreground text-background absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-2 shadow-lg">
          <span className="px-2 text-xs font-extrabold">
            {t("{total} selected", { total: selected.length })}
          </span>
          <span className="bg-background/20 h-5 w-px" />

          {pipeline.stages.slice(0, 3).map((stage) => (
            <Button
              key={stage.id}
              variant="ghost"
              size="sm"
              className="hover:bg-background/15 hover:text-background h-7 text-xs"
              onClick={() => {
                onBulkMove(selected, stage);
                setSelected([]);
              }}
            >
              → {stage.name}
            </Button>
          ))}

          {members.slice(0, 3).map((member) => (
            <Button
              key={member.id}
              variant="ghost"
              size="sm"
              className="hover:bg-background/15 hover:text-background h-7 gap-1.5 text-xs"
              onClick={() => {
                onBulkAssign(selected, [member.id]);
                setSelected([]);
              }}
            >
              <LeadAvatar
                name={member.name}
                photo={member.profilePhoto}
                tone="person"
                colorKey={member.id}
                size="sm"
              />
              {member.name?.split(" ")[0]}
            </Button>
          ))}

          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-background/15 hover:text-background size-7"
            onClick={() => setSelected([])}
            aria-label={t("Clear selection")}
          >
            <IconX className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
