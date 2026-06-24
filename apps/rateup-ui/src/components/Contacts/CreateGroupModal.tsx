"use client";

import { useEffect, useState } from "react";

import { useForm } from "@mantine/form";
import { getHotkeyHandler } from "@mantine/hooks";
import { useNavigate } from "@tanstack/react-router";
import { Folder } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ContactGroupType } from "@/types/enums.ts";
import {
  useCreateContactGroupMutation,
  useEditContactGroupMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";

import { TeamSelector } from "../input/TeamSelector.tsx";
import { Avatar, AvatarImage } from "../ui/avatar.tsx";
import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Spinner } from "../ui/spinner.tsx";

interface GroupModalProps {
  opened: boolean;
  setOpened: (value) => void;
  isEdit?: boolean;
  groupDetails?: any;
  type?: ContactGroupType;
}

const CreateGroupModal = ({
  opened,
  setOpened,
  isEdit,
  groupDetails,
  type,
}: GroupModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const form = useForm({
    initialValues: groupDetails
      ? { ...groupDetails, contactType: [] }
      : {
          name: "",
          icon: "",
          teamId: "",
          contactType: [],
          tags: {},
        },
    validate: {
      name: (value) => (value.length ? null : translations("Cannot be empty")),
      teamId: (value) =>
        !isEdit && !value && translations("Must select a team"),
    },
  });

  useEffect(() => {
    if (groupDetails) {
      form.setValues(groupDetails);
      form.setFieldValue("teamId", groupDetails.teamId);
    } else {
      form.reset();
    }
  }, [groupDetails]);

  const createContactGroupMutation = useCreateContactGroupMutation();

  const editContactGroupMutation = useEditContactGroupMutation(
    groupDetails?.id,
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const validation = form.validate();
    if (validation.hasErrors) {
      return;
    }

    // Process tags for selected contact types
    const result = {};
    for (const key of form.values.contactType) {
      if (form.values?.tags?.hasOwnProperty(key)) {
        result[key] = form.values?.tags?.[key];
      }
    }

    const updatedValues = {
      ...form.values,
      type,
      tags: result,
    };

    if (isEdit) {
      editContactGroupMutation.mutate(updatedValues, {
        onSuccess: () => {
          setOpened(false);
          form.reset();
        },
        onError: () => {
          form.reset();
        },
      });
    } else {
      createContactGroupMutation.mutate(updatedValues, {
        onSuccess: (data) => {
          setOpened(false);
          form.reset();
          const route = `/dashboard/${type === ContactGroupType.LOYALTY ? "loyalty/customer/group" : "contacts/groups"}/${data?.data?.id}`;
          navigate({
            to: route,
          });
        },
        onError: () => {
          form.reset();
        },
      });
    }
  };

  useEffect(() => {
    if (!file) return;
    setIsUploading(true);
    uploadFile(file)
      .then((key) => {
        form.setFieldValue("icon", key);
        setIsUploading(false);
      })
      .catch((err) => {
        toast.error(translations("Error uploading icon. Please try again."));
        setIsUploading(false);
      });
  }, [file]);

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <form
          onSubmit={handleSubmit}
          onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, handleSubmit]])}
        >
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a new contact group with team
            </DialogDescription>
          </DialogHeader>
          <div className="my-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col space-y-2">
                <Label>{translations("Group Name")}</Label>
                <Input
                  {...form.getInputProps("name")}
                  required
                  placeholder={translations("Enter group name")}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <TeamSelector
                {...form.getInputProps("teamId")}
                label={translations("Select Team")}
                readOnly={isEdit}
                className="w-full"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex flex-col gap-2 mt-4 ">
              {form.values.icon?.length ? (
                <Avatar>
                  <AvatarImage
                    src={getFileUrlFromKey(form.values.icon)}
                    alt={form.values.name}
                  />
                </Avatar>
              ) : (
                <Folder />
              )}
              <div className="space-y-4">
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />

                <Button asChild>
                  <Label htmlFor="file-upload">
                    {file
                      ? `Selected: ${file.name}`
                      : translations("Upload Icon")}
                  </Label>
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">
                <span className="text-sm font-normal">
                  {translations("Cancel")}
                </span>
              </Button>
            </DialogClose>
            <Button disabled={isUploading} type="submit">
              {(editContactGroupMutation.isPending ||
                createContactGroupMutation.isPending) && <Spinner />}
              <span className="text-sm font-normal">
                {isEdit ? translations("Save") : translations("Create Group")}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;
