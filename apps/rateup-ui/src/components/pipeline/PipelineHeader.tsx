import { IconAlertTriangle, IconPlus, IconSearch, IconUsers, IconX } from "@tabler/icons-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

import { pipelineKeys } from "@/backend/pipeline/pipeline.keys.ts";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { SECTION_TITLE } from "@/components/common/page-heading.tsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PipelineView } from "@/store/pipeline.store.ts";

import { VIEW_TABS } from "./pipeline.constants.tsx";
import { leadFilterLabel, sourceLabel, viewTabLabel } from "./pipeline.labels.ts";
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
  const { pipelines, pipeline, stats, members, view, setView } = data;
  const searchRef = useRef<HTMLInputElement>(null);

  // Everything narrowing the board, named after what the user clicked rather
  // than after the field: "Stage: leads" reads back as the row they picked in
  // the sidebar. An id whose row has since gone still lists — as the bare id —
  // rather than vanishing, because a filter you cannot see is exactly the state
  // this row exists to prevent.
  //
  // Each carries its own way out instead of a field name: the saved view resets
  // to "all leads" while a facet clears to null, and both have to be reachable
  // from here. All of it survives a reload, so the board can come back narrowed
  // by something chosen days ago.
  const facets: Array<{ id: string; label: string; value: string; clear: () => void }> = [];

  if (view.filter !== "open") {
    facets.push({
      id: "filter",
      label: t("View"),
      value: leadFilterLabel(t, view.filter),
      clear: () => setView({ filter: "open" }),
    });
  }
  if (view.stageId) {
    const stage = pipeline?.stages.find((row) => row.id === view.stageId);
    facets.push({
      id: "stageId",
      label: t("Stage"),
      value: stage?.name ?? view.stageId,
      clear: () => setView({ stageId: null }),
    });
  }
  if (view.teamId) {
    const team = stats?.teams.find((row) => row.id === view.teamId);
    facets.push({
      id: "teamId",
      label: t("Team"),
      value: team?.name ?? view.teamId,
      clear: () => setView({ teamId: null }),
    });
  }
  if (view.source) {
    facets.push({
      id: "source",
      label: t("Source"),
      value: sourceLabel(t, view.source),
      clear: () => setView({ source: null }),
    });
  }
  if (view.assigneeId) {
    const member = members.find((row) => row.id === view.assigneeId);
    facets.push({
      id: "assigneeId",
      label: t("Assignee"),
      value: member?.name ?? t("Teammate"),
      clear: () => setView({ assigneeId: null }),
    });
  }

  // Both describe the whole board, not the cards a column happens to have
  // loaded — so the number that warns you counts every stale lead, not the
  // stale ones on screen.
  const openCount = stats?.totals.open ?? 0;
  const rottingCount = stats?.totals.rotting ?? 0;

  return (
    <header className="border-border flex flex-col gap-3 border-b px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {pipelines.length > 1 ? (
          <Select
            items={pipelines.map((row) => ({ value: row.id, label: row.name }))}
            value={pipeline?.id ?? null}
            onValueChange={(value) => value && data.setPipeline(value)}
          >
            <SelectTrigger
              aria-label={t("Active pipeline")}
              className="font-display h-9 border-none px-1 text-xl font-extrabold shadow-none"
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
          <h1 className={SECTION_TITLE}>{pipeline?.name ?? t("Pipeline")}</h1>
        )}

        <RefreshButton queryKeys={[...pipelineKeys.all()]} />

        <Badge variant="secondary" className="gap-1.5">
          <IconUsers />
          {t("{open} open · {total} leads", {
            open: openCount,
            total: stats?.totals.leads ?? 0,
          })}
        </Badge>

        {rottingCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView({ filter: "rotting" })}
            className="text-destructive hover:bg-destructive/10 h-7 gap-1.5 rounded-full px-3 text-xs font-bold"
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
            ref={searchRef}
            value={view.search}
            onChange={(event) => setView({ search: event.target.value })}
            placeholder={t("Search leads")}
          />
          {/* Clearing is a facet reset like any other, so it belongs in the
              field rather than only in the filter chips — and the focus goes
              back to the input so the next search is one keystroke away. */}
          {view.search ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label={t("Clear search")}
                onClick={() => {
                  setView({ search: "" });
                  searchRef.current?.focus();
                }}
                className="rounded-full"
              >
                <IconX className="size-3.5" />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>

        {members.length > 0 ? (
          <div className="hidden items-center md:flex">
            {members.map((member) => {
              const active = data.params.assigneeId === member.id;
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
                          !data.params.assigneeId || active
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

      {/* Every facet that is narrowing the board, on the board itself.
          The sidebar already marks the active row, but it scrolls — and a facet
          whose row is off screen, or whose target has been deleted, left the
          columns empty with nothing on screen to explain it. Each chip clears
          its own facet, so whatever emptied the board can always be undone from
          where the emptiness is. */}
      {facets.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {facets.map((facet) => (
            <Badge
              key={facet.id}
              variant="secondary"
              className="gap-1 rounded-full py-0.5 pr-1 pl-2.5 font-medium"
            >
              <span className="text-muted-foreground">{facet.label}</span>
              <span className="max-w-40 truncate">{facet.value}</span>
              <button
                type="button"
                onClick={facet.clear}
                aria-label={t("Remove filter: {name}", { name: facet.value })}
                className="hover:bg-background/80 rounded-full p-0.5 transition-colors"
              >
                <IconX className="size-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              data.clearFacets();
              setView({ filter: "open" });
            }}
            className="text-muted-foreground h-6 rounded-full px-2 text-xs"
          >
            {t("Clear filters")}
          </Button>
        </div>
      ) : null}

      {/* Scrolls sideways on phones, where five tabs are wider than the screen. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Tabs value={view.view} onValueChange={(value) => setView({ view: value as PipelineView })}>
          <TabsList aria-label={t("Pipeline views")}>
            {VIEW_TABS.map(({ id, icon: Icon }) => (
              <TabsTrigger key={id} value={id}>
                <Icon />
                {viewTabLabel(t, id)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </header>
  );
}
