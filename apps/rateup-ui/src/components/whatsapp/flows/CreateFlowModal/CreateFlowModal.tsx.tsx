import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import { useTeamsByUser } from "@/backend/team/team.query";
import { useCreateFlowMutation } from "@/backend/whatsapp/flow/flow.query";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { SAVE_HOTKEY } from "@/utils/constants.ts";
import { getHotkeyHandler } from "@/utils/hotkeys.ts";

import { flowsCategories } from "../constants.tsx";

interface CreateFlowFormValues {
  name: string;
  categories: string[];
  teamId: string[];
}

function CreateFlowModal({ opened, onClose }) {
  const { t: translations } = useTranslation();

  const schema = z.object({
    name: z.string().min(1, translations("Please enter a name")),
    categories: z.array(z.string()).min(1, translations("Please select a category")),
    teamId: z.array(z.string()),
  });

  const form = useForm<CreateFlowFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      categories: [],
      teamId: [],
    },
  });

  const navigate = useNavigate();
  const { data: teamRes } = useTeamsByUser();
  const teamOptions =
    teamRes?.data?.map((team) => ({
      value: team?.id,
      label: team?.name,
    })) ?? [];

  const handleModalClose = useCallback(() => {
    form.reset();
    onClose();
  }, [form, onClose]);

  const createFlowMutation = useCreateFlowMutation();
  const handleSubmitBtnClick = (values: CreateFlowFormValues) => {
    createFlowMutation.mutate(
      {
        name: values.name,
        categories: values.categories,
        teamIds: values.teamId,
      },
      {
        onSettled: (id) => {
          handleModalClose();
          if (!id && typeof id !== "string") return;
          navigate({
            to: `/dashboard/whatsapp/flows/v2/${id}`,
          });
        },
        onError: (error) => {
          console.error(error);
        },
      },
    );
  };

  const submit = form.handleSubmit(handleSubmitBtnClick);

  return (
    <Dialog open={opened} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent onKeyDown={getHotkeyHandler([[SAVE_HOTKEY, submit]])}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{translations("Create Flow")}</DialogTitle>
        </DialogHeader>

        <FieldGroup className="gap-4">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{translations("Name")}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder={translations("Enter Name")}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="categories"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{translations("Categories")}</FieldLabel>
                <MultiSelect
                  options={flowsCategories}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={translations("Select Categories")}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="teamId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{translations("Select Teams")}</FieldLabel>
                <MultiSelect
                  options={teamOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={translations("Select teams")}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={handleModalClose}>
            {translations("Cancel")}
          </Button>
          <Button type="button" disabled={createFlowMutation.isPending} onClick={submit}>
            {createFlowMutation.isPending && <Spinner />}
            {translations("Submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateFlowModal;
