import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

import {
  useCreateContactGroupMutation,
  useEditContactGroupMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import { ContactGroupType } from "@/types/enums.ts";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { getFileUrlFromKey, uploadFile } from "@/utils/file-upload/upload.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";

import { TeamSelector } from "../input/TeamSelector.tsx";
import { Avatar, AvatarImage } from "../ui/avatar.tsx";
import { Button, buttonVariants } from "../ui/button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Field, FieldError, FieldLabel, FieldTitle } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Spinner } from "../ui/spinner.tsx";

interface GroupModalProps {
  opened: boolean;
  setOpened: (value: boolean) => void;
  isEdit?: boolean;
  groupDetails?: any;
  type?: ContactGroupType;
}

const CreateGroupModal = ({ opened, setOpened, isEdit, groupDetails, type }: GroupModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { t: translations } = useTranslation();

  const groupFormSchema = z
    .object({
      name: z.string().trim().min(1, translations("Cannot be empty")),
      teamId: z.string().optional(),
    })
    .passthrough()
    .superRefine((values, ctx) => {
      if (!isEdit && !values.teamId) {
        ctx.addIssue({
          code: "custom",
          path: ["teamId"],
          message: translations("Must select a team"),
        });
      }
    });

  const defaultValues = groupDetails
    ? { ...groupDetails, contactType: [] }
    : {
        name: "",
        icon: "",
        teamId: "",
        contactType: [],
        tags: {},
      };

  const form = useForm<any>({
    resolver: zodResolver(groupFormSchema),
    defaultValues,
  });

  const iconValue = form.watch("icon");
  const nameValue = form.watch("name");

  useEffect(() => {
    if (groupDetails) {
      form.reset({ ...groupDetails });
    } else {
      form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupDetails]);

  const createContactGroupMutation = useCreateContactGroupMutation();

  const editContactGroupMutation = useEditContactGroupMutation(groupDetails?.id);

  const onSubmit = () => {
    const values = form.getValues();

    // Process tags for selected contact types
    const result: Record<string, unknown> = {};
    for (const key of values.contactType ?? []) {
      if (values?.tags?.hasOwnProperty(key)) {
        result[key] = values?.tags?.[key];
      }
    }

    const updatedValues = {
      ...values,
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
        form.setValue("icon", key);
        setIsUploading(false);
      })
      .catch((_err) => {
        toast.error(translations("Error uploading icon. Please try again."));
        setIsUploading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, () => void form.handleSubmit(onSubmit)()]])}
        >
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>Create a new contact group with team</DialogDescription>
          </DialogHeader>
          <div className="my-5">
            <div className="flex flex-col gap-4">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{translations("Group Name")}</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
                      required
                      placeholder={translations("Enter group name")}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {fieldState.invalid && (
                      <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="teamId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldTitle>{translations("Select Team")}</FieldTitle>
                    <TeamSelector
                      value={field.value}
                      onChange={field.onChange}
                      className="w-full"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <div className="flex flex-col gap-2 mt-4 ">
              {iconValue?.length ? (
                <Avatar>
                  <AvatarImage src={getFileUrlFromKey(iconValue)} alt={nameValue} />
                </Avatar>
              ) : (
                <Folder />
              )}
              <div className="flex flex-col gap-4">
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />

                <Label htmlFor="file-upload" className={buttonVariants()}>
                  {file ? `Selected: ${file.name}` : translations("Upload Icon")}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="secondary" type="button" />}>
              <span className="text-sm font-normal">{translations("Cancel")}</span>
            </DialogClose>
            <Button disabled={isUploading} type="submit">
              {(editContactGroupMutation.isPending || createContactGroupMutation.isPending) && (
                <Spinner />
              )}
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
