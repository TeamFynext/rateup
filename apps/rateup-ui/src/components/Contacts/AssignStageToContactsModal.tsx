import { IconCircleCheck, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useBulkSetContactStageMutation } from "@/backend/pipeline/pipeline.query";
import { StageSelector } from "@/components/pipeline/shared/StageSelector.tsx";

import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Label } from "../ui/label.tsx";
import { Spinner } from "../ui/spinner.tsx";

/**
 * Puts a selection of contacts on one column of the board — the pipeline
 * replacement for `ApplyLifecycletoContactsModal`.
 *
 * Assigning a stage opens a lead for any contact that has none, so this both
 * moves and adds. It never removes: a contact already on the target column is
 * left untouched rather than re-added, which is why the toast reports what
 * actually changed instead of claiming the whole selection moved.
 */
const AssignStageToContactsModal = ({
  opened,
  setOpened,
  contactIds,
  onSuccess = null,
}: Readonly<{
  opened: boolean;
  setOpened: (open: boolean) => void;
  contactIds: string[];
  onSuccess?: (() => void) | null;
}>) => {
  const { t } = useTranslation();
  const [stageId, setStageId] = useState("");
  const assign = useBulkSetContactStageMutation();

  function handleCancel() {
    setStageId("");
    setOpened(false);
  }

  function handleAssign() {
    if (!stageId) return;
    assign.mutate(
      { contactIds, stageId },
      {
        onSuccess: (result) => {
          // "12 moved, 3 already there" beats "updated" — a bulk write that
          // silently no-ops on part of the selection is otherwise unreadable.
          toast.success(
            result.unchanged > 0
              ? t("{changed} contacts moved, {unchanged} already on that stage", {
                  changed: result.changed,
                  unchanged: result.unchanged,
                })
              : t("{count} contacts moved", { count: result.changed }),
          );
          onSuccess?.();
          handleCancel();
        },
        // Errors are reported by the mutation itself.
      },
    );
  }

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Update lead stage")}</DialogTitle>
          <DialogDescription>
            {t("Put the selected contacts on a stage of your pipeline.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 text-muted-foreground">
          <IconUsers className="w-5 h-5" />
          {""}
          <span>
            {contactIds.length} {t("contacts selected")}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t("Lead stage")}</Label>
          <StageSelector value={stageId} onChange={setStageId} className="w-full" />
        </div>
        <DialogFooter>
          <Button onClick={handleCancel} variant={"secondary"}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleAssign} disabled={!stageId || assign.isPending}>
            {assign.isPending ? <Spinner /> : <IconCircleCheck />}
            {t("Assign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignStageToContactsModal;
