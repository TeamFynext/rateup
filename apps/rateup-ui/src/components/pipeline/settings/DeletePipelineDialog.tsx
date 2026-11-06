import { IconAlertTriangle } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useDeletePipelineMutation } from "@/backend/pipeline/pipeline.query.tsx";
import type { PipelineDetail } from "@/backend/pipeline/pipeline.types.ts";
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

interface DeletePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: PipelineDetail;
  /** Called once the pipeline is gone, so the caller can leave the board. */
  onDeleted: () => void;
}

/**
 * Deleting a pipeline takes its leads with it, so the confirmation asks for the
 * pipeline's name rather than a yes/no — typing it out is hard to do by
 * accident, and it makes the reader name what they are about to lose.
 */
export function DeletePipelineDialog({
  open,
  onOpenChange,
  pipeline,
  onDeleted,
}: Readonly<DeletePipelineDialogProps>) {
  const { t } = useTranslation();
  const deletePipeline = useDeletePipelineMutation();
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (open) setConfirmation("");
  }, [open]);

  const matches = confirmation.trim() === pipeline.name;

  const submit = () => {
    if (!matches) return;
    deletePipeline.mutate(pipeline.id, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-lg">
              <IconAlertTriangle className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-display font-extrabold">
                {t("Delete {name}", { name: pipeline.name })}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "This cannot be undone. Every lead on this board goes with it, along with their notes, timelines and scheduled activities.",
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ul className="text-muted-foreground bg-muted flex flex-col gap-1 rounded-lg p-3 text-xs">
          <li>
            {t("{total} stages and every lead sitting in them", {
              total: pipeline.stages.length,
            })}
          </li>
          <li>
            {t("{labels} labels and {reasons} lost reasons", {
              labels: pipeline.labels.length,
              reasons: pipeline.lostReasons.length,
            })}
          </li>
          <li>{t("All notes, timeline entries and next activities on those leads")}</li>
        </ul>

        <p className="text-muted-foreground text-xs">
          {t(
            "Contacts and their inbox conversations are not touched — only this pipeline's own records are removed.",
          )}
        </p>

        <div>
          {/* One sentence with the name interpolated rather than a bolded span
              spliced mid-phrase: the emphasis is not worth fixing English word
              order into every locale, and the name is already in the title. */}
          <Label htmlFor="delete-pipeline-name">
            {t("Type {name} to confirm", { name: pipeline.name })}
          </Label>
          <Input
            id="delete-pipeline-name"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder={pipeline.name}
            autoComplete="off"
            className="mt-1.5"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={!matches || deletePipeline.isPending}
          >
            {t("Delete pipeline")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
