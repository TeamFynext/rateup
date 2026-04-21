import React, { useState } from "react";

import { toast } from "sonner";

import { useAddExistingContactMutation } from "@/backend/campaign/contactGroup/contactGroup.query";

import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Spinner } from "../ui/spinner";
import ContactGroupSelector from "./ContactGroupSelector";

const AddToGroupModal = ({
  opened,
  setOpened,
  selectedContactIds,
  contact = null,
  onSuccess = null,
}) => {
  const [contactGroupId, setContactGroupId] = useState("");
  const addExistingContactsMutation =
    useAddExistingContactMutation(contactGroupId);
  const handleAddExistingContacts = async () => {
    if (!contactGroupId.length) {
      return toast.error("Please select a group");
    }
    addExistingContactsMutation.mutate(
      {
        customerList: selectedContactIds,
        groupId: contactGroupId,
      },
      {
        onSuccess: () => {
          toast.success("contact added to group");
          if (onSuccess) {
            onSuccess();
          }
          setOpened(false);
        },
        onError: (error) => {
          toast.error(error?.message || "error adding contact to group");
          setOpened(false);
        },
      },
    );
  };

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contacts to Group</DialogTitle>
          <DialogDescription>
            Select Group to add the contacts
          </DialogDescription>
        </DialogHeader>
        {selectedContactIds?.length === 1 && contact ? (
          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input readOnly defaultValue={contact.name} />
            <Label>Phone</Label>
            <Input readOnly defaultValue={contact.phone} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {selectedContactIds.length} Contacts selected
          </p>
        )}
        <Label>Group</Label>
        <ContactGroupSelector
          value={contactGroupId}
          onChange={setContactGroupId}
          className="w-full"
        />
        <DialogFooter>
          <DialogClose>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAddExistingContacts}>
            {addExistingContactsMutation.isPending && <Spinner />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToGroupModal;
