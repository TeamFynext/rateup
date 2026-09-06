import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
  IconAlertTriangle,
  IconGripVertical,
  IconPlus,
  IconTrash,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateLostReasonMutation,
  useCreateStageMutation,
  useDeleteLostReasonMutation,
  useReorderStagesMutation,
  useTeamPipelineDefaultsQuery,
  useUpdatePipelineMutation,
  useUpdateStageMutation,
} from "@/backend/pipeline/pipeline.query.tsx";
import type {
  PipelineDetail,
  PipelineStage,
  StageStatus,
} from "@/backend/pipeline/pipeline.types.ts";
import { useTeamsByUser } from "@/backend/team/team.query.tsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import { UserRole } from "@/utils/enums/index.ts";

import { STAGE_COLOR_CHOICES, STAGE_STATUSES, STATUS_BAND } from "../pipeline.constants.tsx";
import { stageStatusLabel } from "../pipeline.labels.ts";
import { StageDot } from "../shared/atoms.tsx";
import { ConversionsApiSection } from "./ConversionsApiSection.tsx";
import { DeletePipelineDialog } from "./DeletePipelineDialog.tsx";
import { DeleteStageDialog } from "./DeleteStageDialog.tsx";

/** A section heading, at the one size and weight the design uses for them. */
function SectionTitle({ children }: Readonly<{ children: React.ReactNode }>) {
  return <h2 className="font-nunito text-foreground text-[15px] font-semibold">{children}</h2>;
}

function SectionNote({ children }: Readonly<{ children: React.ReactNode }>) {
  return <p className="text-muted-foreground mt-1 mb-3.5 text-xs">{children}</p>;
}

/**
 * Only rules that actually run.
 *
 * `autoAssignEnabled` and `nudgeEnabled` are still columns on the pipeline and
 * still accepted by the update schema, but nothing in the API ever reads them —
 * they were switches that persisted a boolean and changed nothing. Listing a
 * control that does nothing is worse than not offering it, so they are gone from
 * here until they are built. Lead creation by rule lives in the automation rule
 * builder's Assign Lifecycle action instead.
 */
interface AutomationToggle {
  key: "rottingEnabled";
  name: string;
  description: string;
  icon: Icon;
  /** Tinted icon tile, per the design — each rule reads as its own thing. */
  tone: string;
}

/** A function of `t` rather than a constant, so the copy can be translated. */
function automationToggles(t: TFunction): AutomationToggle[] {
  return [
    {
      key: "rottingEnabled",
      name: t("Flag stalled leads"),
      description: t("Highlight leads idle past their stage's rotting window."),
      icon: IconAlertTriangle,
      tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
    },
  ];
}

/**
 * Who works this board.
 *
 * Membership is the pipeline's only access rule — every pipeline route checks it
 * — so this is the screen's most consequential control.
 *
 * You may only add teams you are on yourself, which is the API's rule, not a UI
 * one. Teams already on the board that you are not a member of stay listed but
 * cannot be removed here: dropping one would be a one-way door you could not undo.
 */
/**
 * Renaming the board. Mounted with `key={pipeline.id}` so switching boards
 * resets the field rather than carrying one board's unsaved text onto another.
 */
function NameSection({ pipeline }: Readonly<{ pipeline: PipelineDetail }>) {
  const { t } = useTranslation();
  const updatePipeline = useUpdatePipelineMutation();
  const [name, setName] = useState(pipeline.name);

  const trimmed = name.trim();
  // An empty name would leave an unlabelled row in the switcher, and saving the
  // name it already has would toast for nothing.
  const canSave = Boolean(trimmed) && trimmed !== pipeline.name && !updatePipeline.isPending;

  const save = () => {
    if (!canSave) return;
    updatePipeline.mutate({ pipelineId: pipeline.id, input: { name: trimmed } });
  };

  return (
    <section>
      <SectionTitle>{t("Name")}</SectionTitle>
      <SectionNote>{t("What this board is called in the sidebar and the switcher.")}</SectionNote>

      <Card className="flex-row flex-wrap items-center gap-2 p-3.5 shadow-xs">
        <Input
          id="pipeline-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
          }}
          aria-label={t("Pipeline name")}
          className="min-w-52 flex-1"
        />
        <Button size="sm" onClick={save} disabled={!canSave}>
          {t("Save")}
        </Button>
      </Card>
    </section>
  );
}

function TeamsSection({ pipeline }: Readonly<{ pipeline: PipelineDetail }>) {
  const { t } = useTranslation();
  const updatePipeline = useUpdatePipelineMutation();
  const { data: teamsResponse } = useTeamsByUser();
  const { data: orgTeams = [] } = useTeamPipelineDefaultsQuery();

  const myTeams = teamsResponse?.data ?? [];
  const myTeamIds = new Set(myTeams.map((team) => team.id));
  const otherTeamIds = pipeline.teamIds.filter((id) => !myTeamIds.has(id));
  const mineOnBoard = pipeline.teamIds.filter((id) => myTeamIds.has(id));

  // Every team on the board, in org order, with its routing state attached.
  const teamsOnBoard = orgTeams.filter((team) => pipeline.teamIds.includes(team.id));

  const saveMembership = (next: string[]) => {
    // Removing your own last team would lock you out of the board you are
    // editing, so the select keeps at least one.
    if (!next.length) return;
    updatePipeline.mutate({
      pipelineId: pipeline.id,
      input: { teamIds: [...next, ...otherTeamIds] },
    });
  };

  return (
    <section>
      <SectionTitle>{t("Teams")}</SectionTitle>
      <SectionNote>
        {t("Everyone on these teams can open the board and be assigned its leads.")}
      </SectionNote>

      <Card className="gap-0 overflow-hidden p-0 shadow-xs">
        <div className="p-3.5">
          <MultiSelect
            id="pipeline-teams"
            options={myTeams.map((team) => ({ value: team.id, label: team.name }))}
            value={mineOnBoard}
            onValueChange={saveMembership}
            placeholder={t("Pick the teams that work this pipeline")}
            emptyIndicator={t("You are not on any team yet.")}
          />
        </div>

        {teamsOnBoard.map((team) => (
          <div
            key={team.id}
            className="border-border/60 flex flex-wrap items-center gap-3 border-t p-3.5"
          >
            <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
              <IconUsersGroup className="size-4" />
            </span>
            <span className="flex min-w-32 flex-1 items-center gap-2">
              <span className="text-foreground truncate text-[13.5px] font-medium">
                {team.name}
              </span>
              {!myTeamIds.has(team.id) && <Badge variant="outline">{t("Not your team")}</Badge>}
            </span>
          </div>
        ))}

        <p className="text-muted-foreground border-border/60 border-t p-3.5 text-[11px]">
          {t("Removing a team hides the board from its members; their leads stay where they are.")}
        </p>
      </Card>
    </section>
  );
}

/**
 * What a dragged stage row carries. `index` rides along so the drop can be
 * resolved by position without searching the list again.
 */
interface StageDragData extends Record<string, unknown> {
  type: "pipeline-stage";
  stageId: string;
  index: number;
}

function isStageDragData(data: Record<string, unknown>): data is StageDragData {
  return (
    data.type === "pipeline-stage" &&
    typeof data.stageId === "string" &&
    typeof data.index === "number"
  );
}

function StageRow({
  stage,
  index,
  total,
  canDelete,
  canReorder,
  onNudge,
  otherStages,
}: Readonly<{
  stage: PipelineStage;
  index: number;
  /** How many columns the board has, so the handle can say "3 of 7". */
  total: number;
  canDelete: boolean;
  /** A one-stage board has nothing to reorder, so the handle is not offered. */
  canReorder: boolean;
  onNudge: (index: number, direction: -1 | 1) => void;
  otherStages: PipelineStage[];
}>) {
  const { t } = useTranslation();
  const updateStage = useUpdateStageMutation();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [name, setName] = useState(stage.name);
  const [probability, setProbability] = useState(String(stage.probability));
  const [rottingDays, setRottingDays] = useState(String(stage.rottingDays));

  const rowRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLButtonElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const element = rowRef.current;
    const handle = handleRef.current;
    if (!element || !handle || !canReorder) return;

    return combine(
      draggable({
        element,
        // Only the grip starts a drag. The row is full of inputs and selects, and
        // a row-wide drag would swallow every attempt to select text in them.
        dragHandle: handle,
        getInitialData: (): StageDragData => ({
          type: "pipeline-stage",
          stageId: stage.id,
          index,
        }),
        /**
         * The browser's own drag image is not usable here. Generating it from the
         * row means capturing through the app shell's transformed ancestors, and
         * Chrome answers that by snapshotting the whole stacking context — the
         * page appeared to lift off the screen. Rendering our own chip means the
         * preview is a known, small thing rather than whatever the compositor
         * decides to grab.
         */
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            // Beside the cursor, not under it — under the pointer the chip covers
            // the insertion line you are aiming with.
            getOffset: pointerOutsideOfPreview({ x: "12px", y: "8px" }),
            render: ({ container }) => {
              const chip = document.createElement("div");
              chip.textContent = stage.name;
              chip.className =
                "bg-card border-border text-foreground rounded-lg border px-3 py-2 text-sm font-semibold shadow-md";
              container.append(chip);
              return () => chip.remove();
            },
          });
        },
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => isStageDragData(source.data),
        getData: ({ input }) =>
          // The edge decides whether the row lands above or below this one, which
          // is what makes dropping on the top half mean something different from
          // the bottom half.
          attachClosestEdge(
            { type: "pipeline-stage", stageId: stage.id, index },
            { element, input, allowedEdges: ["top", "bottom"] },
          ),
        onDrag: ({ self, source }) => {
          // A row is never a drop indicator for itself.
          if (source.data.stageId === stage.id) return setClosestEdge(null);
          setClosestEdge(extractClosestEdge(self.data));
        },
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      }),
    );
    // `stage.name` is in here for the preview chip. It changes only when a rename
    // commits, not per keystroke, so this re-registers rarely.
  }, [stage.id, stage.name, index, canReorder]);

  /** Only writes when the field actually changed and parses to a sane number. */
  const commitNumber = (field: "probability" | "rottingDays", raw: string, max: number) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(max, Math.max(0, parsed));
    if (clamped === stage[field]) return;
    updateStage.mutate({ stageId: stage.id, input: { [field]: clamped } });
  };

  return (
    <div
      ref={rowRef}
      className={cn(
        "border-border/60 relative flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0",
        dragging && "opacity-40",
      )}
    >
      {/* Where the row would land, drawn on the edge the pointer is nearest. An
          absolute line rather than a shifted layout: nudging the real rows apart
          made the list jump while the pointer was still moving over it.

          The knob on the left end is what separates this from the hairline row
          borders it sits directly on top of — a bare 2px rule at a row boundary
          read as one more border rather than as "it lands here". */}
      {closestEdge && (
        <span
          aria-hidden
          className={cn(
            "bg-primary pointer-events-none absolute inset-x-0 z-10 h-0.5",
            closestEdge === "top" ? "-top-px" : "-bottom-px",
          )}
        >
          <span className="border-primary bg-background absolute -top-0.75 left-0 size-2 rounded-full border-2" />
        </span>
      )}

      {canReorder && (
        <div className="flex items-center gap-1.5">
          <button
            ref={handleRef}
            type="button"
            // Arrow keys do the same job without the precision a drag needs. This
            // is the only way to reorder from the keyboard, and on a trackpad it
            // is usually the easier one either way.
            onKeyDown={(event) => {
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
              event.preventDefault();
              onNudge(index, event.key === "ArrowUp" ? -1 : 1);
            }}
            aria-label={t("Reorder {stage}, currently {position} of {total}", {
              stage: stage.name,
              position: index + 1,
              total,
            })}
            title={t("Drag to reorder, or use the arrow keys")}
            // `touch-none` so dragging the grip on a touch screen reorders instead
            // of scrolling the page; `select-none` so a slow drag does not leave the
            // row's text highlighted behind the preview.
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring -ml-1.5 cursor-grab touch-none rounded p-1 select-none focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
          >
            <IconGripVertical className="size-4" />
          </button>
          {/* The board reads left to right in this order, so saying which
              position a column is in answers the question the list raises. */}
          <span className="text-muted-foreground w-4 text-right text-xs tabular-nums">
            {index + 1}
          </span>
        </div>
      )}

      <div className="flex min-w-52 flex-1 items-center gap-2.5">
        <Select
          items={STAGE_COLOR_CHOICES.map((choice) => ({ value: choice, label: choice }))}
          value={stage.color ?? STAGE_COLOR_CHOICES[0]}
          onValueChange={(value) =>
            value && updateStage.mutate({ stageId: stage.id, input: { color: value } })
          }
        >
          <SelectTrigger
            aria-label={t("Colour for {stage}", { stage: stage.name })}
            className="size-8 justify-center p-0 [&>svg:last-child]:hidden"
          >
            <StageDot color={stage.color} className="size-3" />
          </SelectTrigger>
          <SelectContent>
            {STAGE_COLOR_CHOICES.map((choice) => (
              <SelectItem key={choice} value={choice}>
                <span className="flex items-center gap-2">
                  <StageDot color={choice} />
                  {choice}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            const trimmed = name.trim();
            if (!trimmed || trimmed === stage.name) {
              setName(stage.name);
              return;
            }
            updateStage.mutate({ stageId: stage.id, input: { name: trimmed } });
          }}
          className="h-9 min-w-32 flex-1 md:max-w-48 md:flex-none"
          aria-label={t("Lead stage name")}
        />
        <span className="text-muted-foreground text-[11px]">
          {t("{total} leads", { total: stage.openLeadCount })}
        </span>
      </div>

      <div className="w-full sm:w-44">
        <Select
          items={STAGE_STATUSES.map((status) => ({
            value: status,
            label: stageStatusLabel(t, status),
          }))}
          value={stage.status}
          onValueChange={(value) =>
            // Base UI hands back null when the value is cleared; the field has no
            // empty state, so the current status stands.
            updateStage.mutate({
              stageId: stage.id,
              input: { status: (value as StageStatus | null) ?? stage.status },
            })
          }
        >
          {/* A soft pill, as the design draws it: in a dense table a row of plain
              grey selects reads as chrome, while a tinted chip reads as the value
              it holds. */}
          <SelectTrigger
            size="sm"
            aria-label={t("Lead stage status")}
            className={cn(
              "h-7 w-full rounded-full border-transparent text-[11px] font-bold shadow-none",
              STATUS_BAND[stage.status].surface,
              STATUS_BAND[stage.status].text,
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {stageStatusLabel(t, status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-24 items-center gap-1.5">
        <Input
          value={probability}
          onChange={(event) => setProbability(event.target.value)}
          onBlur={() => commitNumber("probability", probability, 100)}
          className="h-8 w-14 text-right"
          inputMode="numeric"
          aria-label={t("Win probability")}
        />
        <span className="text-muted-foreground text-xs">%</span>
      </div>

      <div className="flex w-28 items-center gap-1.5">
        <Input
          value={rottingDays}
          onChange={(event) => setRottingDays(event.target.value)}
          onBlur={() => commitNumber("rottingDays", rottingDays, 365)}
          className="h-8 w-14 text-right"
          inputMode="numeric"
          aria-label={t("Rotting after")}
        />
        <span className="text-muted-foreground text-xs">{t("days")}</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive size-8"
        disabled={!canDelete}
        title={canDelete ? t("Delete lead stage") : t("A pipeline needs at least one lead stage")}
        // Confirmed rather than done on the click: the leads in this column have
        // to land somewhere, and that destination is the reader's to choose.
        onClick={() => setConfirmingDelete(true)}
        aria-label={t("Delete {stage}", { stage: stage.name })}
      >
        <IconTrash className="size-4" />
      </Button>

      <DeleteStageDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        stage={stage}
        otherStages={otherStages}
      />
    </div>
  );
}

export function SettingsView({ pipeline }: Readonly<{ pipeline: PipelineDetail | undefined }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updatePipeline = useUpdatePipelineMutation();
  const createStage = useCreateStageMutation();
  const createLostReason = useCreateLostReasonMutation();
  const deleteLostReason = useDeleteLostReasonMutation();
  const [newReason, setNewReason] = useState("");
  const [addingReason, setAddingReason] = useState(false);
  const { user } = useUser();
  const reorderStages = useReorderStagesMutation();

  const stages = pipeline?.stages;

  /**
   * The one place a new column order is written, whether it came from a drag or
   * from the keyboard. Both produce a reordered list and nothing else differs, so
   * they share the no-op check and the re-indexing.
   */
  const commitOrder = useCallback(
    (next: PipelineStage[]) => {
      if (!pipeline || !stages) return;
      // A drop that changes nothing — released on the row it was picked up from,
      // or nudged past the end of the list — is a round trip and a toast for a
      // change nobody made.
      if (next.every((stage, position) => stage.id === stages[position].id)) return;

      reorderStages.mutate({
        pipelineId: pipeline.id,
        // Re-indexed from zero rather than sent as-is: `order` is the board's
        // column sequence, and gaps left by a deleted stage would otherwise
        // survive every reorder.
        stages: next.map((stage, position) => ({ id: stage.id, order: position })),
      });
    },
    [pipeline, stages, reorderStages],
  );

  /** Keyboard reordering: one step up or down from where the stage sits now. */
  const nudgeStage = useCallback(
    (index: number, direction: -1 | 1) => {
      if (!stages) return;
      const to = index + direction;
      if (to < 0 || to >= stages.length) return;

      const next = [...stages];
      [next[index], next[to]] = [next[to], next[index]];
      commitOrder(next);
    },
    [stages, commitOrder],
  );

  useEffect(() => {
    if (!stages) return;

    return monitorForElements({
      canMonitor: ({ source }) => isStageDragData(source.data),
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0];
        if (!target || !isStageDragData(source.data) || !isStageDragData(target.data)) return;

        const startIndex = source.data.index;
        const indexOfTarget = target.data.index;
        if (startIndex === indexOfTarget) return;

        commitOrder(
          reorderWithEdge({
            list: stages,
            startIndex,
            indexOfTarget,
            closestEdgeOfTarget: extractClosestEdge(target.data),
            axis: "vertical",
          }),
        );
      },
    });
  }, [stages, commitOrder]);

  if (!pipeline) return null;

  // Who works a board and whether it is deleted are org-level calls, not board
  // tuning: a member can retune their own funnel without being able to hand the
  // board to another team or destroy it and every lead on it.
  const isOrgAdmin = user?.role === UserRole.SUPADM;

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <div className="flex max-w-4xl flex-col gap-5">
        {/* The columns come first: they are what the board is, and the only thing
            most visits to this screen are here to change. */}
        <section>
          <div className="mb-1 flex items-center justify-between">
            <SectionTitle>{t("Lead stages")}</SectionTitle>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() =>
                createStage.mutate({
                  pipelineId: pipeline.id,
                  // Deliberately not translated: this is a stored stage name the
                  // whole org sees, so it must not depend on who clicked. The
                  // creator renames it in place straight after.
                  name: "New stage",
                  probability: 50,
                  rottingDays: 5,
                })
              }
            >
              <IconPlus className="size-4" />
              {t("Add lead stage")}
            </Button>
          </div>
          <p className="text-muted-foreground mb-3.5 text-xs">
            {t(
              "These are your board's own columns, numbered left to right as they appear on it. Drag a row by its handle to move it, or focus a handle and use the arrow keys. Status decides what happens when a lead lands here — Won and Lost columns close the lead and are left out of open counts.",
            )}
          </p>

          <Card className="gap-0 overflow-hidden p-0 shadow-xs">
            <div className="bg-muted border-border hidden flex-wrap items-center gap-3 border-b px-4 py-2.5 md:flex">
              {/* Lines the headings up with the rows, which now lead with a grip
                  and a position number. */}
              {pipeline.stages.length > 1 && (
                <span className="text-muted-foreground -ml-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold tracking-[0.04em] uppercase">
                  <span className="w-6" />
                  <span className="w-4 text-right">{t("#")}</span>
                </span>
              )}
              <span className="text-muted-foreground min-w-52 flex-1 text-[11.5px] font-semibold tracking-[0.04em] uppercase">
                {t("Lead stage")}
              </span>
              <span className="text-muted-foreground w-44 text-[11.5px] font-semibold tracking-[0.04em] uppercase">
                {t("Status")}
              </span>
              <span className="text-muted-foreground w-24 text-[11.5px] font-semibold tracking-[0.04em] uppercase">
                {t("Probability")}
              </span>
              <span className="text-muted-foreground w-28 text-[11.5px] font-semibold tracking-[0.04em] uppercase">
                {t("Rotting after")}
              </span>
              <span className="w-8" />
            </div>

            {pipeline.stages.map((stage, index) => (
              <StageRow
                key={stage.id}
                stage={stage}
                index={index}
                total={pipeline.stages.length}
                canDelete={pipeline.stages.length > 1}
                canReorder={pipeline.stages.length > 1}
                onNudge={nudgeStage}
                otherStages={pipeline.stages.filter((candidate) => candidate.id !== stage.id)}
              />
            ))}
          </Card>
        </section>

        {/* One column all the way down. Side-by-side sections had to reconcile
            heights they have no reason to share, which is what left the ragged
            gaps; stacked, each is simply as tall as its content. */}
        <section>
          <SectionTitle>{t("Lost reasons")}</SectionTitle>
          <SectionNote>{t("Reps pick one when marking a lead lost.")}</SectionNote>

          <Card className="gap-0 overflow-hidden p-0 shadow-xs">
            {pipeline.lostReasons.map((reason) => (
              <div
                key={reason.id}
                className="border-border/60 flex items-center gap-3 border-b p-3.5"
              >
                <span className="text-foreground flex-1 text-[13.5px] font-medium">
                  {reason.label}
                </span>
                <span className="text-muted-foreground text-[11px]">{reason.leadCount}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive size-7"
                  onClick={() => deleteLostReason.mutate(reason.id)}
                  aria-label={t("Delete {reason}", { reason: reason.label })}
                >
                  <IconTrash className="size-3.5" />
                </Button>
              </div>
            ))}

            {/* A quiet "+ Add reason" row until it is wanted, rather than an
                  input and a button sitting permanently under the list. */}
            {addingReason ? (
              <form
                className="flex items-center gap-2 p-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const label = newReason.trim();
                  if (!label) return;
                  createLostReason.mutate(
                    { pipelineId: pipeline.id, label },
                    {
                      onSuccess: () => {
                        setNewReason("");
                        setAddingReason(false);
                      },
                    },
                  );
                }}
              >
                <Input
                  autoFocus
                  value={newReason}
                  onChange={(event) => setNewReason(event.target.value)}
                  placeholder={t("e.g. Went with a rival")}
                  className="h-8"
                  aria-label={t("New lost reason")}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    setNewReason("");
                    setAddingReason(false);
                  }}
                />
                <Button type="submit" size="sm" variant="secondary" disabled={!newReason.trim()}>
                  {t("Add")}
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingReason(true)}
                className="text-primary hover:bg-muted flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors"
              >
                <IconPlus className="size-4" />
                {t("Add reason")}
              </button>
            )}
          </Card>
        </section>

        {/* Admin-only: handing the board to another team is an org-level call, not
            board tuning, so a member can retune their own funnel without it. */}
        {isOrgAdmin && <TeamsSection pipeline={pipeline} />}

        <section>
          <SectionTitle>{t("Automation")}</SectionTitle>
          <SectionNote>{t("Rules that keep the pipeline and the inbox in sync.")}</SectionNote>

          <div className="flex flex-col gap-2.5">
            {automationToggles(t).map((toggle) => {
              const ToggleIcon = toggle.icon;
              return (
                <Card key={toggle.key} className="flex-row items-center gap-3 p-3.5 shadow-xs">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      toggle.tone,
                    )}
                  >
                    <ToggleIcon className="size-4" />
                  </span>
                  {/* `Label` is `flex items-center gap-2`, so the name and the
                        description sat side by side and each wrapped. Stack them. */}
                  <Label
                    htmlFor={toggle.key}
                    className="min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5"
                  >
                    <span className="text-foreground text-[13.5px] font-medium">{toggle.name}</span>
                    <span className="text-muted-foreground text-[12.5px] font-normal">
                      {toggle.description}
                    </span>
                  </Label>
                  <Switch
                    id={toggle.key}
                    checked={pipeline[toggle.key]}
                    onCheckedChange={(checked) =>
                      updatePipeline.mutate({
                        pipelineId: pipeline.id,
                        input: { [toggle.key]: checked },
                      })
                    }
                  />
                </Card>
              );
            })}
          </div>
        </section>

        {/* The board's name is what the whole org calls it, so it sits with the
            other org-level calls rather than up with the columns. */}
        {isOrgAdmin && <NameSection key={pipeline.id} pipeline={pipeline} />}

        {/* Reporting a win to Meta. It belongs to the board rather than to the
            lifecycle now, because a lead reaching a Won column is what fires the
            event. Sits directly above the danger zone. */}
        <section>
          <h2 className="font-nunito text-[15px] font-semibold">{t("Conversion tracking")}</h2>
          <SectionNote>
            {t("Send a conversion event to Meta when a lead is won on this board.")}
          </SectionNote>
          <ConversionsApiSection />
        </section>

        {/* Admin-only: deleting the board. Stays last — it is the one action that
            cannot be undone, so it should not sit above routine tuning. */}
        {isOrgAdmin && (
          <section>
            <h2 className="text-destructive font-nunito text-[15px] font-semibold">
              {t("Danger zone")}
            </h2>
            <SectionNote>{t("Actions here cannot be undone.")}</SectionNote>

            <Card className="border-destructive/40 flex-row items-center gap-3 p-3.5 shadow-xs">
              <span className="bg-destructive/10 text-destructive flex size-8 shrink-0 items-center justify-center rounded-md">
                <IconTrash className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-foreground block text-[13.5px] font-medium">
                  {t("Delete this pipeline")}
                </span>
                <span className="text-muted-foreground block text-[11px]">
                  {t(
                    "Removes the board, its stages and every lead on it, with their notes and timelines. Contacts are left alone.",
                  )}
                </span>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                {t("Delete")}
              </Button>
            </Card>
          </section>
        )}
      </div>

      <DeletePipelineDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        pipeline={pipeline}
        // The pipeline behind `?p` no longer exists, so the whole search is
        // replaced: the page falls back to whichever pipeline is now first, and
        // lands on its board rather than on another pipeline's settings.
        onDeleted={() =>
          void navigate({ to: "/dashboard/pipeline", search: { view: "board", f: "open" } })
        }
      />
    </div>
  );
}
