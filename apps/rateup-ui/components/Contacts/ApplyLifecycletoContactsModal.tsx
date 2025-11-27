import React, { useState } from "react";

import { CircleCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useUpdateLifecycleofMultipleContacts } from "@/backend/campaign/contacts/contacts.query";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Spinner } from "../ui/spinner";
import { LifecycleSelector } from "./LifecycleSelector";

const ApplyLifecycletoContactsModal = ({
  opened,
  setOpened,
  contactIds,
  onSuccess = null,
}) => {
  const t = useTranslations();
  const [lifecycleId, setLifecycleId] = useState("");
  const update = useUpdateLifecycleofMultipleContacts();
  function handleUpdateLifecycleStage() {
    update.mutate(
      { lifecycleId, contactIds },
      {
        onSuccess: () => {
          toast.success("life cycle stage updated");
          if (onSuccess) {
            onSuccess();
          }
          handleCancel();
        },
        onError: () => {
          toast.error("Error updating lifecycle stage");
        },
      },
    );
  }
  function handleCancel() {
    setLifecycleId("");
    setOpened(false);
  }
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Update Lifecycle Stage")}</DialogTitle>
          <DialogDescription>
            {t("Update Lifecycle Stage of Contacts")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 text-muted-foreground">
          <Users className="w-5 h-5" />{" "}
          <span>
            {contactIds.length} {t("contacts selected")}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <Label>{t("Lifecycle Stage")}</Label>
          <LifecycleSelector
            value={lifecycleId}
            onChange={setLifecycleId}
            className="w-full"
          />
        </div>
        <DialogFooter>
          <Button onClick={handleCancel} variant={"secondary"}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleUpdateLifecycleStage}>
            {update.isPending ? <Spinner /> : <CircleCheck />}
            {t("Update")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyLifecycletoContactsModal;
