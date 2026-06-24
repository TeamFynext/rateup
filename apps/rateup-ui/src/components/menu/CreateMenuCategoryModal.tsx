import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
} from "@/backend/menu/category/mCategory.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { createCustomTimestamp, formatToCustomTime } from "@/utils/dateTime.ts";

interface CreateMenuCategoryModalProps {
  readonly opened: boolean;
  readonly close: () => void;
  readonly menuId: string;
  readonly editingItem?: MenuCategory;
}

type MenuCategoryFormValues = {
  name: string;
  menuId: string;
  scheduleEnabled: boolean;
  startTime?: string;
  endTime?: string;
};

export function CreateMenuCategoryModal({
  opened,
  close,
  menuId,
  editingItem,
}: CreateMenuCategoryModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { t: translations } = useTranslation();

  const form = useForm<MenuCategoryFormValues>({
    defaultValues: editingItem
      ? {
          ...editingItem,
          startTime: formatToCustomTime(editingItem.startTime),
          endTime: formatToCustomTime(editingItem.endTime),
        }
      : {
          name: "",
          menuId: menuId,
          scheduleEnabled: false,
          startTime: "",
          endTime: "",
        },
    mode: "onSubmit",
  });

  const scheduleEnabled = form.watch("scheduleEnabled");

  useEffect(() => {
    if (editingItem) {
      form.reset({
        ...editingItem,
        startTime: formatToCustomTime(editingItem.startTime),
        endTime: formatToCustomTime(editingItem.endTime),
      });
    } else {
      form.reset({
        name: "",
        menuId: menuId,
        scheduleEnabled: false,
        startTime: "",
        endTime: "",
      });
    }
  }, [editingItem, form, menuId]);

  const createMenuCategoryMutation = useCreateMenuCategoryMutation(
    menuId,
    () => {
      form.reset({
        name: "",
        menuId: menuId,
        scheduleEnabled: false,
        startTime: "",
        endTime: "",
      });
      close();
      setIsCreating(false);
    },
    () => {
      setIsCreating(false);
    },
  );

  const editMenuCategoryMutation = useUpdateMenuCategoryMutation(
    menuId,
    () => {
      form.reset({
        name: "",
        menuId: menuId,
        scheduleEnabled: false,
        startTime: "",
        endTime: "",
      });
      close();
      setIsCreating(false);
    },
    () => {
      setIsCreating(false);
    },
  );

  const onSubmit = (values: MenuCategoryFormValues) => {
    if (!values.name.trim()) {
      form.setError("name", { message: translations("Cannot be empty") });
      return;
    }

    setIsCreating(true);
    const formatedData: any = { ...values };
    if (values.scheduleEnabled) {
      formatedData.startTime = values.startTime && createCustomTimestamp(values.startTime);
      formatedData.endTime = values.endTime && createCustomTimestamp(values.endTime);
    } else {
      formatedData.startTime = undefined;
      formatedData.endTime = undefined;
    }

    if (editingItem) {
      editMenuCategoryMutation.mutate({
        categoryId: editingItem.id,
        menuCategory: formatedData,
      });
      return;
    }

    createMenuCategoryMutation.mutate(formatedData);
  };

  if (!menuId) {
    return null;
  }

  const isPending =
    createMenuCategoryMutation.isPending || editMenuCategoryMutation.isPending || isCreating;

  return (
    <Dialog open={opened} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="sm:max-w-130">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? translations("Edit Category") : translations("Create Category")}
          </DialogTitle>
          <DialogDescription>{translations("Category Details")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="relative">
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
              <Spinner />
            </div>
          )}

          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="category-name">{translations("Name")}</FieldLabel>
              <FieldContent>
                <Input
                  id="category-name"
                  placeholder={translations("Name")}
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </FieldContent>
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="timed-menu-switch">{translations("Timed Menu")}</FieldLabel>
              <FieldContent>
                <Controller
                  control={form.control}
                  name="scheduleEnabled"
                  render={({ field }) => (
                    <Switch
                      id="timed-menu-switch"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </FieldContent>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="start-time">{translations("Start Time:")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="start-time"
                    type="time"
                    disabled={!scheduleEnabled}
                    {...form.register("startTime")}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="end-time">{translations("End Time:")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="end-time"
                    type="time"
                    disabled={!scheduleEnabled}
                    {...form.register("endTime")}
                  />
                </FieldContent>
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={close}>
              {translations("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {editingItem ? translations("Save Category") : translations("Create Category")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
