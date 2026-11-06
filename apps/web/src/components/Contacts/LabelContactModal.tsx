import { Button } from "@rateup/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import { Label } from "@rateup/ui/components/label";
import { Spinner } from "@rateup/ui/components/spinner";
import { IconCircleCheck, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAssignContactLabelsToMultipleContacts } from "@/backend/campaign/contacts/contacts.query";

import LabelSelector from "./LabelSelector.tsx";

const LabelContactModal = ({
  opened,
  setOpened,
  contactIds,
  onSuccess = null,
}: {
  opened: boolean;
  setOpened: (open: boolean) => void;
  contactIds: string[];
  onSuccess?: (() => void) | null;
}) => {
  const { t } = useTranslation();
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const assign = useAssignContactLabelsToMultipleContacts();
  function handleApplyLabels() {
    assign.mutate(
      { labelIds, contactIds },
      {
        onSuccess: () => {
          toast.success("labels applied to selected contacts");
          if (onSuccess) {
            onSuccess();
          }
          handleCancel();
        },
        onError: (error) => {
          toast.error(error?.message || "Error applying labels");
        },
      },
    );
  }
  function handleCancel() {
    setLabelIds([]);
    setOpened(false);
  }
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Apply Labels to Contacts")}</DialogTitle>
          <DialogDescription>
            {t("Apply Label to contacts to identify and distinguish customers")}
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
          <Label>{t("Labels")}</Label>
          <LabelSelector
            value={labelIds}
            onChange={setLabelIds}
            allowMultiSelect
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button onClick={handleCancel} variant={"secondary"}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleApplyLabels}>
            {assign.isPending ? <Spinner /> : <IconCircleCheck />}
            {t("Apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabelContactModal;
