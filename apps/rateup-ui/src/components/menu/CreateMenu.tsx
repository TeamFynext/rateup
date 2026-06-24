"use client";

import { useContext, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import {
  useCreateMenuMutation,
  useUpdateMenuMutation,
} from "@/backend/menu/menu.query";
import SelectedTeamContext from "@/context/SelectedTeam.ts";

import { TeamSelector } from "../input/TeamSelector.tsx";
import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field.tsx";
import { Input } from "../ui/input.tsx";
import { Spinner } from "../ui/spinner.tsx";

const schema = z.object({
  name: z.string().min(1, "Cannot be empty"),
  displayName: z.string().min(1, "Cannot be empty"),
  teamId: z.string().min(1, "select a team"),
});

type FormValues = z.infer<typeof schema>;

interface CreateMenuModalProps {
  readonly opened: boolean;
  readonly close: () => void;
  readonly editingItem?: Menu;
}
export function CreateMenuModal({
  opened,
  close,
  editingItem,
}: CreateMenuModalProps) {
  const { selectedTeamId } = useContext(SelectedTeamContext);
  const { t: translations } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editingItem || {
      name: "",
      displayName: "",
      teamId: "",
    },
  });

  const createMenuMutation = useCreateMenuMutation(
    selectedTeamId,
    close,
    () => {
      reset();
    },
  );
  const updateMenuMutation = useUpdateMenuMutation(
    selectedTeamId,
    () => {
      close();
    },
    () => {},
  );

  useEffect(() => {
    if (editingItem) {
      reset(editingItem);
    } else {
      reset({ name: "", displayName: "", teamId: "" });
    }
  }, [editingItem, reset]);

  const isPending =
    createMenuMutation.isPending || updateMenuMutation.isPending;

  const onSubmit = (values: FormValues) => {
    if (editingItem) {
      updateMenuMutation.mutate({
        menuId: editingItem.id,
        updatedData: values,
      });
    } else {
      createMenuMutation.mutate(values);
    }
  };

  if (!selectedTeamId) {
    return null;
  }

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingItem
              ? translations("Edit Menu")
              : translations("Create Menu")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="relative">
            {isPending && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
                <Spinner />
              </div>
            )}
            <FieldGroup>
              <Field data-invalid={!!errors.teamId}>
                <FieldLabel>{translations("Team")}</FieldLabel>
                <Controller
                  control={control}
                  name="teamId"
                  render={({ field }) => (
                    <TeamSelector
                      value={field.value}
                      onChange={field.onChange}
                      label=""
                      allowDeselect={false}
                      enableDefaultValue={false}
                    />
                  )}
                />
                {errors.teamId && (
                  <FieldError>{errors.teamId.message}</FieldError>
                )}
              </Field>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">
                  {translations("Menu Name")}
                </FieldLabel>
                <Input
                  id="name"
                  placeholder={translations("Menu 1")}
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.displayName}>
                <FieldLabel htmlFor="displayName">
                  {translations("Display Name")}
                </FieldLabel>
                <Input
                  id="displayName"
                  placeholder={translations("Hotel Name")}
                  aria-invalid={!!errors.displayName}
                  {...register("displayName")}
                />
                {errors.displayName && (
                  <FieldError>{errors.displayName.message}</FieldError>
                )}
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner data-icon="inline-end" />}
              {editingItem
                ? translations("Save Menu")
                : translations("Create Menu")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
