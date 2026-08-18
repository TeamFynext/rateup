import {
  IconAlertTriangle,
  IconPlus,
  IconRepeat,
  IconTrash,
  IconTrophy,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useLifeCyclesQuery } from "@/backend/lifecycle/lifecycle.query.ts";
import {
  useCreateLostReasonMutation,
  useCreateStageMutation,
  useDeleteLostReasonMutation,
  useDeleteStageMutation,
  usePipelinesQuery,
  useTeamPipelineDefaultsQuery,
  useUpdatePipelineMutation,
  useUpdateStageMutation,
  useUpdateTeamPipelineDefaultMutation,
} from "@/backend/pipeline/pipeline.query.tsx";
import type {
  PipelineDetail,
  PipelineStage,
  TeamPipelineDefault,
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
import { useConfirm } from "@/context/confirm-provider.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { cn } from "@/lib/utils.ts";
import { UserRole } from "@/utils/enums/index.ts";

import { STAGE_COLOR_CHOICES } from "../pipeline.constants.tsx";
import { StageDot } from "../shared/atoms.tsx";
import { DeletePipelineDialog } from "./DeletePipelineDialog.tsx";

/** A section heading, at the one size and weight the design uses for them. */
function SectionTitle({ children }: Readonly<{ children: React.ReactNode }>) {
  return <h2 className="font-nunito text-foreground text-[15px] font-extrabold">{children}</h2>;
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
 * here until they are built. Lead creation by rule now lives in the automation
 * rule builder's Assign Lifecycle action instead.
 */
interface AutomationToggle {
  key: "rottingEnabled" | "lifecycleSyncEnabled";
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
    {
      key: "lifecycleSyncEnabled",
      name: t("Sync lifecycle to the inbox"),
      description: t("Moving a lead updates the contact's lifecycle stage."),
      icon: IconRepeat,
      tone: "bg-primary/10 text-primary",
    },
  ];
}

/**
 * Who works this board, and whose contacts land on it automatically.
 *
 * Membership is the pipeline's only access rule — every pipeline route checks it
 * — so this is the screen's most consequential control. Auto-add lives here too
 * rather than in lifecycle setup, because a team can only be pointed at a board
 * it is already on: routing a team somewhere its members cannot look is then not
 * a state the UI can express.
 *
 * You may only add teams you are on yourself, which is the API's rule, not a UI
 * one. Teams already on the board that you are not a member of stay listed, with
 * their auto-add still switchable, but cannot be removed here: dropping one would
 * be a one-way door you could not undo.
 */
function TeamsSection({ pipeline }: Readonly<{ pipeline: PipelineDetail }>) {
  const { t } = useTranslation();
  const updatePipeline = useUpdatePipelineMutation();
  const updateTeam = useUpdateTeamPipelineDefaultMutation();
  const confirm = useConfirm();
  const { data: teamsResponse } = useTeamsByUser();
  const { data: orgTeams = [] } = useTeamPipelineDefaultsQuery();
  const { data: pipelines = [] } = usePipelinesQuery();

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

  const toggleAutoAdd = async (team: TeamPipelineDefault, checked: boolean) => {
    if (!checked) {
      // Leave the team pointed here; it simply stops filing automatically.
      updateTeam.mutate({ teamId: team.id, input: { autoCreateLeads: false } });
      return;
    }

    // A team files into exactly one board, so switching this on takes the team
    // off whatever board it was on. Name that board rather than moving it
    // silently — the other pipeline's settings will show the switch flip.
    if (team.defaultPipelineId && team.defaultPipelineId !== pipeline.id) {
      const currentName =
        pipelines.find((entry) => entry.id === team.defaultPipelineId)?.name ??
        t("another pipeline");
      const moved = await confirm({
        title: t("Move {team} to this pipeline?", { team: team.name }),
        description: t(
          "{team} currently auto-files its contacts into {current}. Turning this on moves it here, and {current} stops receiving them. Leads already on either board stay where they are.",
          { team: team.name, current: currentName },
        ),
        confirmText: t("Move"),
      });
      if (!moved) return;
    }

    updateTeam.mutate({
      teamId: team.id,
      input: { defaultPipelineId: pipeline.id, autoCreateLeads: true },
    });
  };

  return (
    <section>
      <SectionTitle>{t("Teams")}</SectionTitle>
      <SectionNote>
        {t("Everyone on these teams can open the board and be assigned its leads.")}
      </SectionNote>

      <Card className="gap-0 overflow-hidden p-0">
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

        {teamsOnBoard.map((team) => {
          const switchId = `pipeline-auto-add-${team.id}`;
          const filesHere = team.defaultPipelineId === pipeline.id && team.autoCreateLeads;
          return (
            <div
              key={team.id}
              className="border-border/60 flex flex-wrap items-center gap-3 border-t p-3.5"
            >
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                <IconUsersGroup className="size-4" />
              </span>
              <span className="flex min-w-32 flex-1 items-center gap-2">
                <span className="text-foreground truncate text-[13px] font-bold">{team.name}</span>
                {!myTeamIds.has(team.id) && <Badge variant="outline">{t("Not your team")}</Badge>}
              </span>
              <Label htmlFor={switchId} className="text-muted-foreground text-xs font-medium">
                {t("Auto-add contacts")}
              </Label>
              <Switch
                id={switchId}
                checked={filesHere}
                onCheckedChange={(checked) => void toggleAutoAdd(team, checked)}
              />
            </div>
          );
        })}

        <p className="text-muted-foreground border-border/60 border-t p-3.5 text-[11px]">
          {t(
            "With auto-add on, a contact reaching a lifecycle stage this board maps opens a lead here — unless they are on the board already. Removing a team hides the board from its members and switches its auto-add off; their leads stay put.",
          )}
        </p>
      </Card>
    </section>
  );
}

function StageRow({
  stage,
  lifecycles,
  canDelete,
  otherStages,
}: Readonly<{
  stage: PipelineStage;
  lifecycles: Array<{ id: string; name: string; emoji: string }>;
  canDelete: boolean;
  otherStages: PipelineStage[];
}>) {
  const { t } = useTranslation();
  const updateStage = useUpdateStageMutation();
  const deleteStage = useDeleteStageMutation();
  const [name, setName] = useState(stage.name);
  const [probability, setProbability] = useState(String(stage.probability));
  const [rottingDays, setRottingDays] = useState(String(stage.rottingDays));

  /** Only writes when the field actually changed and parses to a sane number. */
  const commitNumber = (field: "probability" | "rottingDays", raw: string, max: number) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(max, Math.max(0, parsed));
    if (clamped === stage[field]) return;
    updateStage.mutate({ stageId: stage.id, input: { [field]: clamped } });
  };

  return (
    <div className="border-border/60 flex flex-wrap items-center gap-3 border-b p-4 last:border-b-0">
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
          aria-label={t("Stage name")}
        />
        {/* Read-only: which column wins comes from the mapped lifecycle's own
            `isWon`, and a lifecycle edit rewrites it on every board — so a switch
            here would be overwritten behind the user's back. */}
        {stage.isWon ? (
          <Badge
            variant="outline"
            className="border-green-600/40 text-green-700 dark:text-green-500"
            title={t("Leads reaching this stage are marked won")}
          >
            <IconTrophy className="size-3" />
            {t("Won")}
          </Badge>
        ) : null}
        <span className="text-muted-foreground text-[11px]">
          {t("{total} leads", { total: stage.openLeadCount })}
        </span>
      </div>

      <div className="w-full sm:w-44">
        <Select
          items={[
            { value: "none", label: t("No mapping") },
            ...lifecycles.map((lifecycle) => ({
              value: lifecycle.id,
              label: `${lifecycle.emoji} ${lifecycle.name}`,
            })),
          ]}
          value={stage.lifecycleId ?? "none"}
          onValueChange={(value) =>
            updateStage.mutate({
              stageId: stage.id,
              input: { lifecycleId: value === "none" ? null : value },
            })
          }
        >
          {/* A soft pill, as the design draws it: in a dense table a row of plain
              grey selects reads as chrome, while a tinted chip reads as the value
              it holds. Unmapped stays muted so it is legible as "not set". */}
          <SelectTrigger
            size="sm"
            aria-label={t("Lifecycle mapping")}
            className={cn(
              "h-7 w-full rounded-full border-transparent text-[11px] font-bold shadow-none",
              stage.lifecycleId
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("No mapping")}</SelectItem>
            {lifecycles.map((lifecycle) => (
              <SelectItem key={lifecycle.id} value={lifecycle.id}>
                {lifecycle.emoji} {lifecycle.name}
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
        title={canDelete ? t("Delete stage") : t("A pipeline needs at least one stage")}
        onClick={() =>
          deleteStage.mutate({
            stageId: stage.id,
            // Leads never vanish with a stage: they fall back to the first stage
            // that is still standing.
            moveLeadsToStageId: stage.openLeadCount > 0 ? otherStages[0]?.id : undefined,
          })
        }
        aria-label={t("Delete {stage}", { stage: stage.name })}
      >
        <IconTrash className="size-4" />
      </Button>
    </div>
  );
}

export function SettingsView({ pipeline }: Readonly<{ pipeline: PipelineDetail | undefined }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: lifecycles } = useLifeCyclesQuery();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const updatePipeline = useUpdatePipelineMutation();
  const createStage = useCreateStageMutation();
  const createLostReason = useCreateLostReasonMutation();
  const deleteLostReason = useDeleteLostReasonMutation();
  const [newReason, setNewReason] = useState("");
  const [addingReason, setAddingReason] = useState(false);
  const { user } = useUser();

  if (!pipeline) return null;

  const lifecycleOptions = (lifecycles ?? []).map((lifecycle) => ({
    id: lifecycle.id,
    name: lifecycle.name,
    emoji: lifecycle.emoji,
  }));

  // Who works a board and whether it is deleted are org-level calls, not board
  // tuning: a member can retune their own funnel without being able to hand the
  // board to another team or destroy it and every lead on it.
  const isOrgAdmin = user?.role === UserRole.SUPADM;

  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <div className="flex max-w-4xl flex-col gap-6">
        {/* Admin-only, and first: who works the board frames everything below it. */}
        {isOrgAdmin && <TeamsSection pipeline={pipeline} />}

        <section>
          <div className="mb-1 flex items-center justify-between">
            <SectionTitle>{t("Stages")}</SectionTitle>
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
              {t("Add stage")}
            </Button>
          </div>
          <p className="text-muted-foreground mb-3.5 text-xs">
            {t(
              "These columns come from your contact lifecycle stages, and moving a lead across them updates the contact's lifecycle automatically. Add a stage here for a step this board needs but the lifecycle does not.",
            )}
          </p>

          <Card className="gap-0 overflow-hidden p-0">
            <div className="bg-muted border-border hidden flex-wrap items-center gap-3 border-b px-4 py-2.5 md:flex">
              <span className="text-muted-foreground min-w-52 flex-1 text-[10px] font-extrabold tracking-[0.06em] uppercase">
                {t("Stage")}
              </span>
              <span className="text-muted-foreground w-44 text-[10px] font-extrabold tracking-[0.06em] uppercase">
                {t("Lifecycle mapping")}
              </span>
              <span className="text-muted-foreground w-24 text-[10px] font-extrabold tracking-[0.06em] uppercase">
                {t("Probability")}
              </span>
              <span className="text-muted-foreground w-28 text-[10px] font-extrabold tracking-[0.06em] uppercase">
                {t("Rotting after")}
              </span>
              <span className="w-8" />
            </div>

            {pipeline.stages.map((stage) => (
              <StageRow
                key={stage.id}
                stage={stage}
                lifecycles={lifecycleOptions}
                canDelete={pipeline.stages.length > 1}
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

          <Card className="gap-0 overflow-hidden p-0">
            {pipeline.lostReasons.map((reason) => (
              <div
                key={reason.id}
                className="border-border/60 flex items-center gap-3 border-b p-3.5"
              >
                <span className="text-foreground flex-1 text-[13px] font-semibold">
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
                className="text-primary hover:bg-muted flex items-center gap-2 p-3.5 text-[13px] font-bold transition-colors"
              >
                <IconPlus className="size-4" />
                {t("Add reason")}
              </button>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle>{t("Automation")}</SectionTitle>
          <SectionNote>{t("Rules that keep the pipeline and the inbox in sync.")}</SectionNote>

          <div className="flex flex-col gap-2.5">
            {automationToggles(t).map((toggle) => {
              const ToggleIcon = toggle.icon;
              return (
                <Card key={toggle.key} className="flex-row items-center gap-3 p-3.5">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
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
                    <span className="text-foreground text-[13px] font-bold">{toggle.name}</span>
                    <span className="text-muted-foreground text-[11px] font-normal">
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

        {/* Admin-only: deleting the board. Stays last — it is the one action that
            cannot be undone, so it should not sit above routine tuning. */}
        {isOrgAdmin && (
          <section>
            <h2 className="text-destructive font-nunito text-[15px] font-extrabold">
              {t("Danger zone")}
            </h2>
            <SectionNote>{t("Actions here cannot be undone.")}</SectionNote>

            <Card className="border-destructive/40 flex-row items-center gap-3 p-3.5">
              <span className="bg-destructive/10 text-destructive flex size-8 shrink-0 items-center justify-center rounded-lg">
                <IconTrash className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-foreground block text-[13px] font-bold">
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
