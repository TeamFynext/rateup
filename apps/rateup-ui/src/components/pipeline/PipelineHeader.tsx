import { IconAlertTriangle, IconPlus, IconSearch, IconUsers } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { VIEW_TABS } from "./pipeline.constants.tsx";
import { viewTabLabel } from "./pipeline.labels.ts";
import { isRotting } from "./pipeline.utils.ts";
import { LeadAvatar } from "./shared/LeadAvatar.tsx";
import type { PipelineData } from "./usePipelineData.ts";

interface PipelineHeaderProps {
  data: PipelineData;
  onAddLead: () => void;
}

/**
 * Pipeline title, the at-a-glance counts, the assignee filter strip and the view
 * tabs. The attention chip is a shortcut into the rotting view, so the number
 * that warns you is also the control that shows you what it means.
 */
export function PipelineHeader({ data, onAddLead }: Readonly<PipelineHeaderProps>) {
  const { t } = useTranslation();
  const { pipelines, pipeline, leads, visibleLeads, members, filters, view, setView } = data;

  const openCount = leads.filter((lead) => lead.status === "OPEN").length;
  const rottingCount = pipeline
    ? leads.filter((lead) => isRotting(lead, pipeline.rottingEnabled)).length
    : 0;

  return (
    <header className="border-border flex flex-col gap-3 border-b px-4 pt-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {pipelines.length > 1 ? (
          <Select
            items={pipelines.map((row) => ({ value: row.id, label: row.name }))}
            value={pipeline?.id ?? null}
            onValueChange={(value) => value && data.setPipeline(value)}
          >
            <SelectTrigger
              aria-label={t("Active pipeline")}
              className="font-nunito h-9 border-none px-1 text-xl font-extrabold shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <h1 className="font-nunito text-foreground text-xl font-extrabold">
            {pipeline?.name ?? t("Pipeline")}
          </h1>
        )}

        <Badge variant="secondary" className="gap-1.5">
          <IconUsers />
          {t("{open} open · {showing} showing", {
            open: openCount,
            showing: visibleLeads.length,
          })}
        </Badge>

        {rottingCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView({ filter: "rotting" })}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 gap-1.5 rounded-full px-3 text-xs font-bold"
          >
            <IconAlertTriangle className="size-3.5" />
            {t("{total} need attention", { total: rottingCount })}
          </Button>
        ) : null}

        {/* On a phone the counts and the actions already fill the line, so the
            search field wraps onto its own instead of collapsing to nothing. */}
        <div className="hidden flex-1 sm:block" />

        <InputGroup className="order-last w-full sm:order-none sm:max-w-52">
          <InputGroupAddon>
            <IconSearch className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            value={filters.search}
            onChange={(event) => setView({ search: event.target.value })}
            placeholder={t("Search leads")}
          />
        </InputGroup>

        {members.length > 0 ? (
          <div className="hidden items-center md:flex">
            {members.map((member) => {
              const active = filters.assigneeId === member.id;
              return (
                <Tooltip key={member.id}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => data.toggleFacet("assigneeId", member.id)}
                        className={cn(
                          "ring-card -ml-1.5 rounded-full ring-2 transition-opacity first:ml-0",
                          // With no filter on, everyone reads at full strength;
                          // once one is picked the rest recede rather than all
                          // sitting permanently dimmed.
                          active && "ring-primary",
                          !filters.assigneeId || active
                            ? "opacity-100"
                            : "opacity-40 hover:opacity-100",
                        )}
                      />
                    }
                  >
                    <LeadAvatar
                      name={member.name}
                      photo={member.profilePhoto}
                      colorKey={member.id}
                      tone="person"
                      size="md"
                    />
                  </TooltipTrigger>
                  <TooltipContent>{member.name ?? t("Teammate")}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ) : null}

        <Button size="sm" onClick={onAddLead} className="gap-1.5">
          <IconPlus className="size-4" />
          <span className="hidden sm:inline">{t("Add lead")}</span>
          <span className="sr-only sm:hidden">{t("Add lead")}</span>
        </Button>
      </div>

      <nav
        className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        aria-label={t("Pipeline views")}
      >
        {VIEW_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const active = view.view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView({ view: tab.id })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 pt-2 pb-2.5 text-[13px] transition-colors sm:px-3.5",
                active
                  ? "border-primary text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground border-transparent font-medium",
              )}
            >
              <TabIcon className="size-4" />
              {viewTabLabel(t, tab.id)}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
