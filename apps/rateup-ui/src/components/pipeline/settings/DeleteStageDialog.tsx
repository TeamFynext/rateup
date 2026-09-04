import { IconAlertTriangle } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useIntegrationStatuses } from "@/backend/appsIntegration/integration.query";
import { useDeleteStageMutation } from "@/backend/pipeline/pipeline.query.tsx";
import type { PipelineStage } from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IntegratedApps } from "@/types/enums.ts";

import { StageDot } from "../shared/atoms.tsx";

/**
 * The integrations that carry a lead's status, and so have something to be
 * wrong about after this. Zapier and the rest are unaffected: they are told
 * about changes as they happen and hold no copy of where a lead sits.
 */
const CRM_INTEGRATIONS = [
  { id: IntegratedApps.zoho, label: "Zoho" },
  { id: IntegratedApps.getlead, label: "GetLead" },
];

interface DeleteStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: PipelineStage;
  /** Every other column on the board — the candidates the leads can move to. */
  otherStages: PipelineStage[];
}

/**
 * Confirming the removal of a board column.
 *
 * Deliberately lighter than {@link DeletePipelineDialog}: no typed confirmation,
 * because nothing is lost. A column's leads move to another column rather than
 * being deleted, so the question worth asking is **where they go**, not whether
 * the reader really means it.
 *
 * That destination used to be picked silently — the first remaining column, with
 * no say and no warning. Leads reappearing somewhere nobody chose is the part of
 * this that actually surprises people.
 */
export function DeleteStageDialog({
  open,
  onOpenChange,
  stage,
  otherStages,
}: Readonly<DeleteStageDialogProps>) {
  const { t } = useTranslation();
  const deleteStage = useDeleteStageMutation();
  const { data: integrationStatuses = [] } = useIntegrationStatuses();

  // Shown whenever a CRM is connected, without checking whether the column holds
  // anything: `openLeadCount` counts only open leads, so a Won or Lost column
  // full of closed ones reads as empty — and a closed lead's status is exactly
  // the one a CRM most wants right.
  const connectedCrms = CRM_INTEGRATIONS.filter((crm) =>
    integrationStatuses.some(
      (status: { name?: string; isConnected?: boolean }) =>
        status.name === crm.id && status.isConnected,
    ),
  ).map((crm) => crm.label);
  const [destinationId, setDestinationId] = useState(otherStages[0]?.id ?? "");

  useEffect(() => {
    if (open) setDestinationId(otherStages[0]?.id ?? "");
  }, [open, otherStages]);

  const destination = otherStages.find((candidate) => candidate.id === destinationId);

  const submit = () => {
    if (!destinationId) return;
    deleteStage.mutate(
      {
        stageId: stage.id,
        // Always sent, even when the column looks empty. `openLeadCount` counts
        // only open leads, while the API refuses to delete a column holding any
        // lead at all — so a Won or Lost column full of closed leads looked empty
        // here and failed on the server with nothing the reader could do about it.
        moveLeadsToStageId: destinationId,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-lg">
              <IconAlertTriangle className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-nunito font-extrabold">
                {t("Delete {stage}", { stage: stage.name })}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "The column is removed from the board. Its leads are not deleted — they move to the column you pick below, keeping their notes, timelines and activities.",
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div>
          <Label htmlFor="delete-stage-destination">{t("Move its leads to")}</Label>
          <Select
            items={otherStages.map((candidate) => ({
              value: candidate.id,
              label: candidate.name,
            }))}
            value={destinationId}
            onValueChange={(value) => value && setDestinationId(value)}
          >
            <SelectTrigger id="delete-stage-destination" className="mt-1.5 w-full">
              <SelectValue placeholder={t("Pick a column")} />
            </SelectTrigger>
            <SelectContent>
              {otherStages.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  <span className="flex items-center gap-2">
                    <StageDot color={candidate.color} />
                    {candidate.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Moving an open lead onto a Won or Lost column closes it, which is a
              bigger change than "the column went away" and is worth saying before
              it happens rather than after. */}
          {destination && destination.status !== "OPEN" && stage.openLeadCount > 0 && (
            <p className="text-muted-foreground mt-2 text-xs">
              {t(
                "{name} is a {status} column, so the open leads moved there are closed on arrival.",
                { name: destination.name, status: destination.status.toLowerCase() },
              )}
            </p>
          )}
        </div>

        {/* Deleting a column relocates its leads in bulk, which is the one stage
            change that does not reach the CRMs — see `deleteStage`. Said before
            it happens, because nothing afterwards corrects it. */}
        {connectedCrms.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-foreground mb-1 font-medium">
              {t("{crms} will not be updated", { crms: connectedCrms.join(" and ") })}
            </p>
            <p className="text-muted-foreground">
              {t(
                "Leads moved out of this column keep the status they already have in {crms}. Move a lead again on the board to sync it, or update it there directly.",
                { crms: connectedCrms.join(" and ") },
              )}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={!destinationId || deleteStage.isPending}
          >
            {t("Delete stage")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
