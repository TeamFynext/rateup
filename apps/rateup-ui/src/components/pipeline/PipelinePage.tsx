import { IconColumns, IconGitBranch } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useBulkUpdateLeadsMutation,
  useMoveLeadMutation,
} from "@/backend/pipeline/pipeline.query.tsx";
import type { Lead, PipelineStage } from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import { BoardView } from "./board/BoardView.tsx";
import { CreatePipelineDialog } from "./CreatePipelineDialog.tsx";
import { ForecastView } from "./forecast/ForecastView.tsx";
import { InsightsView } from "./insights/InsightsView.tsx";
import { AddLeadDialog } from "./lead/AddLeadDialog.tsx";
import { CloseLeadDialog, type CloseLeadTarget } from "./lead/CloseLeadDialog.tsx";
import { LeadDrawer } from "./lead/LeadDrawer.tsx";
import { ListView } from "./list/ListView.tsx";
import { PipelineHeader } from "./PipelineHeader.tsx";
import { SettingsView } from "./settings/SettingsView.tsx";
import { usePipelineData } from "./usePipelineData.ts";

/**
 * Stands in for the view while the pipeline loads — the header and the sidebar
 * stay put, so the chrome does not flash in and out on every visit.
 */
function ViewSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-6">
      {[0, 1, 2, 3].map((column) => (
        <Skeleton key={column} className="h-96 w-68.5 shrink-0" />
      ))}
    </div>
  );
}

/**
 * The lead pipeline screen. It owns the data, the drawer and the two dialogs;
 * each view below is a pure rendering of the same filtered lead set, so
 * switching tabs never refetches and never disagrees with the sidebar counts.
 */
export function PipelinePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const data = usePipelineData();
  const { pipeline, view, setView, members } = data;

  const [addOpen, setAddOpen] = useState(false);
  const [addStageId, setAddStageId] = useState<string | undefined>();
  const [closeTarget, setCloseTarget] = useState<CloseLeadTarget | null>(null);

  const moveLead = useMoveLeadMutation(pipeline?.id);
  const bulkUpdate = useBulkUpdateLeadsMutation();

  const openLead = useCallback((leadId: string) => setView({ leadId }), [setView]);

  /** Jumps to the contact's conversation; leads captured offline have none. */
  const openConversation = useCallback(
    (lead: Lead) => {
      if (!lead.contactId) return;
      void navigate({ to: "/dashboard/inbox", search: { contactId: lead.contactId } });
    },
    [navigate],
  );

  const handleMove = useCallback(
    (leadId: string, stage: PipelineStage) => {
      // Landing on the won stage is a close, not a move: it needs a confirmation
      // and an optional note, so route it through the dialog instead.
      const lead = data.leads.find((candidate) => candidate.id === leadId);
      if (stage.isWon && lead) {
        setCloseTarget({ lead, status: "WON" });
        return;
      }
      moveLead.mutate({ leadId, stageId: stage.id, stageName: stage.name });
    },
    [data.leads, moveLead],
  );

  const handleMarkLost = useCallback(
    (leadId: string) => {
      const lead = data.leads.find((candidate) => candidate.id === leadId);
      if (lead) setCloseTarget({ lead, status: "LOST" });
    },
    [data.leads],
  );

  // Only the view swaps out while loading: the header owns the pipeline switcher
  // and the view tabs, and both stay usable throughout.
  const renderView = () => {
    if (data.isLoading) return <ViewSkeleton />;

    if (data.hasNoPipelines) {
      return (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconGitBranch />
            </EmptyMedia>
            <EmptyTitle>{t("No pipelines yet")}</EmptyTitle>
            <EmptyDescription>
              {t(
                "A pipeline turns conversations into a board of stages you can drag leads across. Create one to get started.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setView({ createPipelineOpen: true })}>
            {t("Create a pipeline")}
          </Button>
        </Empty>
      );
    }

    // Columns mirror the org's lifecycle stages, so an org that has not set any
    // up gets sent there rather than to a board with nothing on it.
    if (pipeline && pipeline.stages.length === 0 && view.view !== "settings") {
      return (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconColumns />
            </EmptyMedia>
            <EmptyTitle>{t("This board has no columns")}</EmptyTitle>
            <EmptyDescription>
              {t(
                "A pipeline's columns are your contact lifecycle stages. Add a stage and it appears here — on this board and every other one.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <Button render={<Link to="/dashboard/contacts/lifecycle" />}>
            {t("Set up lifecycle stages")}
          </Button>
        </Empty>
      );
    }

    switch (view.view) {
      case "board":
        return (
          <BoardView
            data={data}
            onOpenLead={openLead}
            onOpenConversation={openConversation}
            onQuickAdd={(stageId) => {
              setAddStageId(stageId);
              setAddOpen(true);
            }}
            onMoveLead={handleMove}
            onMarkLost={handleMarkLost}
          />
        );
      case "list":
        return (
          <ListView
            data={data}
            onOpenLead={openLead}
            onBulkMove={(leadIds, stage) => bulkUpdate.mutate({ leadIds, stageId: stage.id })}
            onBulkAssign={(leadIds, assigneeIds) => bulkUpdate.mutate({ leadIds, assigneeIds })}
          />
        );
      case "forecast":
        return <ForecastView data={data} onOpenLead={openLead} />;
      case "insights":
        return <InsightsView data={data} />;
      case "settings":
        return <SettingsView pipeline={pipeline} />;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <PipelineHeader
          data={data}
          onAddLead={() => {
            setAddStageId(undefined);
            setAddOpen(true);
          }}
        />

        {renderView()}
      </div>

      <LeadDrawer
        leadId={view.leadId ?? undefined}
        pipeline={pipeline}
        members={members}
        onClose={() => setView({ leadId: null })}
        onMarkWon={(lead) => setCloseTarget({ lead, status: "WON" })}
        onMarkLost={(lead) => setCloseTarget({ lead, status: "LOST" })}
        // Same path a board drag takes, so landing on the won stage still asks.
        onMoveStage={handleMove}
        onOpenConversation={openConversation}
      />

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        pipeline={pipeline}
        members={members}
        defaultStageId={addStageId}
      />

      <CloseLeadDialog
        target={closeTarget}
        pipeline={pipeline}
        onClose={() => setCloseTarget(null)}
      />

      <CreatePipelineDialog
        open={view.createPipelineOpen}
        onOpenChange={(open) => setView({ createPipelineOpen: open })}
        // Land on the new board rather than leaving the user on the old one.
        onCreated={data.setPipeline}
      />
    </div>
  );
}
