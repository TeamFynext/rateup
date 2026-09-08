import { IconColumns, IconGitBranch } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  findCachedLead,
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
import { LeadDetailModal } from "./lead/LeadDetailModal.tsx";
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
  const queryClient = useQueryClient();
  const { pipeline, view, setView, members } = data;

  const [addOpen, setAddOpen] = useState(false);
  const [addStageId, setAddStageId] = useState<string | undefined>();
  const [closeTarget, setCloseTarget] = useState<CloseLeadTarget | null>(null);

  const moveLead = useMoveLeadMutation(pipeline?.id);
  const bulkUpdate = useBulkUpdateLeadsMutation();

  const openLead = useCallback((leadId: string) => setView({ leadId }), [setView]);

  // Stable identity, so a memoised column is not re-rendered by a new closure
  // on every keystroke in the header.
  const quickAdd = useCallback((stageId: string) => {
    setAddStageId(stageId);
    setAddOpen(true);
  }, []);

  /** Jumps to the contact's conversation; leads captured offline have none. */
  const openConversation = useCallback(
    (lead: Lead) => {
      if (!lead.contactId) return;
      void navigate({ to: "/dashboard/inbox", search: { contactId: lead.contactId } });
    },
    [navigate],
  );

  const handleMove = useCallback(
    (leadId: string, fromStageId: string, stage: PipelineStage) => {
      // Landing on a closing column is a close, not a move: winning wants a
      // confirmation and losing wants a reason, so both route through the
      // dialog. The column dropped on is carried along, so a board with several
      // Lost columns puts the lead in the one the user actually chose.
      //
      // The lead comes out of the cache rather than a loaded array — the columns
      // are paginated now, so there is no single list to look in.
      const lead = findCachedLead(queryClient, leadId);
      if (stage.status !== "OPEN" && lead) {
        setCloseTarget({ lead, status: stage.status, stageId: stage.id });
        return;
      }
      moveLead.mutate({ leadId, fromStageId, stageId: stage.id, stageName: stage.name });
    },
    [queryClient, moveLead],
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

    // A board whose columns were all deleted has nowhere to put a lead, so it
    // sends you to settings to add one rather than rendering an empty board.
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
                "This board's columns are its own. Add one in settings, and give it a status so the board knows whether landing there closes the lead.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setView({ view: "settings" })}>{t("Open settings")}</Button>
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
            onQuickAdd={quickAdd}
            onMoveLead={handleMove}
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
      {/* `min-h-0` for the same reason the board's card list needs it: a flex
          child defaults to `min-height: auto`, so without it this column refuses
          to shrink below its content and the overflow escapes to the page
          instead of scrolling inside the view. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PipelineHeader
          data={data}
          onAddLead={() => {
            setAddStageId(undefined);
            setAddOpen(true);
          }}
        />

        {renderView()}
      </div>

      <LeadDetailModal
        leadId={view.leadId ?? undefined}
        pipeline={pipeline}
        members={members}
        onClose={() => setView({ leadId: null })}
        onMarkWon={(lead) => setCloseTarget({ lead, status: "WON" })}
        onMarkLost={(lead) => setCloseTarget({ lead, status: "LOST" })}
        // Same path a board drag takes, so landing on a closing column still asks.
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
