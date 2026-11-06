import { IconGitBranch } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreatePipelineMutation,
  usePipelineCreateLimitsQuery,
} from "@/backend/pipeline/pipeline.query.tsx";
import type { PipelineType } from "@/backend/pipeline/pipeline.types.ts";
import { useTeamsByUser } from "@/backend/team/team.query.tsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { OTHER_PIPELINE_LIMIT, PIPELINE_TYPE_ORDER, pipelineTypeConfig } from "./pipelineTypes.ts";

interface CreatePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new pipeline's id, so the caller can switch to it. */
  onCreated: (pipelineId: string) => void;
}

/**
 * Creates a pipeline and hands back its id. The API seeds its columns from the chosen type,
 * so the form asks only for the type, a name and the teams. An org keeps one Leads board.
 */
export function CreatePipelineDialog({
  open,
  onOpenChange,
  onCreated,
}: Readonly<CreatePipelineDialogProps>) {
  const { t } = useTranslation();
  const createPipeline = useCreatePipelineMutation();
  const { data: teamsResponse } = useTeamsByUser();
  const teams = teamsResponse?.data ?? [];
  // Org-wide counts: the pipeline list omits boards on teams this user is not on.
  const { data: limits } = usePipelineCreateLimitsQuery(open);
  const otherLimit = limits?.otherLimit ?? OTHER_PIPELINE_LIMIT;
  const hasLeads = limits?.hasLeadsPipeline ?? false;
  const othersFull = (limits?.otherCount ?? 0) >= otherLimit;
  const unavailable = (type: PipelineType) => (type === "LEADS" ? hasLeads : othersFull);
  const firstAvailable = PIPELINE_TYPE_ORDER.find((type) => !unavailable(type)) ?? "CUSTOM";

  const [type, setType] = useState<PipelineType>("LEADS");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamIds, setTeamIds] = useState<string[]>([]);

  // Reopening starts clean, and a single-team org has nothing to choose.
  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setTeamIds(teams.length === 1 ? [teams[0].id] : []);
  }, [open, teams]);

  // Once the limits load, land on a type that can still be created.
  useEffect(() => {
    if (open) setType(firstAvailable);
  }, [open, firstAvailable]);

  const chosen = pipelineTypeConfig(t, type);
  const canSubmit =
    Boolean(limits) && name.trim().length > 0 && teamIds.length > 0 && !unavailable(type);

  const submit = () => {
    if (!canSubmit) return;
    createPipeline.mutate(
      { name: name.trim(), type, description: description.trim() || undefined, teamIds },
      {
        onSuccess: (pipeline) => {
          onCreated(pipeline.id);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <IconGitBranch className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-display font-extrabold">{t("New pipeline")}</DialogTitle>
              <DialogDescription>{chosen.seedSummary}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label id="pipeline-type-label">{t("Type")}</Label>
            <RadioGroup
              aria-labelledby="pipeline-type-label"
              value={type}
              onValueChange={(value) => {
                const next = PIPELINE_TYPE_ORDER.find((option) => option === value);
                if (next) setType(next);
              }}
              className="mt-1.5 grid gap-2 sm:grid-cols-2"
            >
              {PIPELINE_TYPE_ORDER.map((option) => {
                const config = pipelineTypeConfig(t, option);
                const Icon = config.icon;
                const disabled = unavailable(option);
                return (
                  <label
                    key={option}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border p-3 transition-colors",
                      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                      type === option ? "border-primary bg-primary/5" : "border-border",
                      !disabled && type !== option && "hover:bg-muted",
                    )}
                  >
                    <RadioGroupItem value={option} disabled={disabled} className="mt-0.5" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        {config.label}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs">
                        {disabled
                          ? option === "LEADS"
                            ? t("Your organisation already has a Leads pipeline.")
                            : t("You already have {total} boards besides Leads.", {
                                total: otherLimit,
                              })
                          : config.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="pipeline-name">{t("Name")}</Label>
            <Input
              id="pipeline-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("e.g. WhatsApp Sales")}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="pipeline-teams">{t("Teams")}</Label>
            <MultiSelect
              id="pipeline-teams"
              options={teams.map((team) => ({ value: team.id, label: team.name }))}
              value={teamIds}
              onValueChange={setTeamIds}
              placeholder={t("Pick the teams that work this pipeline")}
              className="mt-1.5"
              emptyIndicator={t("You are not on any team yet.")}
            />
            <p className="text-muted-foreground mt-1.5 text-xs">
              {t("Everyone on these teams can see the board and be assigned to its cards.")}
            </p>
          </div>

          <div>
            <Label htmlFor="pipeline-description">{t("Description")}</Label>
            <Textarea
              id="pipeline-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("Optional — what this pipeline is for")}
              className="mt-1.5 min-h-16"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={submit} disabled={!canSubmit} loading={createPipeline.isPending}>
            {t("Create pipeline")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
