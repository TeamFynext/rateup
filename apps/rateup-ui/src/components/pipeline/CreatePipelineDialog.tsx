import { IconGitBranch } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreatePipelineMutation } from "@/backend/pipeline/pipeline.query.tsx";
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
import { Textarea } from "@/components/ui/textarea";

interface CreatePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new pipeline's id, so the caller can switch to it. */
  onCreated: (pipelineId: string) => void;
}

/**
 * Creates a pipeline and hands back its id. Its columns are the org's contact
 * stages and its lost reasons are the standard set — the API seeds
 * both — so the form only asks for the two things it cannot guess.
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

  const canSubmit = name.trim().length > 0 && teamIds.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    createPipeline.mutate(
      { name: name.trim(), description: description.trim() || undefined, teamIds },
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
              <DialogTitle className="font-nunito font-extrabold">{t("New pipeline")}</DialogTitle>
              <DialogDescription>
                {t(
                  "The board starts with a standard funnel — New Lead through to Won and Lost. Rename the columns, or change what each one does, afterwards in pipeline settings.",
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
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
              {t("Everyone on these teams can see the board and be assigned leads.")}
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
          <Button onClick={submit} disabled={!canSubmit || createPipeline.isPending}>
            {t("Create pipeline")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
