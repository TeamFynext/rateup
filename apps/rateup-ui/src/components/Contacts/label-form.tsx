import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import type { CustomFieldData, CustomFieldType } from "@/backend/campaign/contacts/contacts.api";
import {
  useCreateCustomFieldMutation,
  useUpdateCustomFieldMutation,
} from "@/backend/campaign/contacts/contacts.query";
import { Button } from "@/components/ui/button.tsx";
import { DialogClose, DialogFooter } from "@/components/ui/dialog.tsx";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { TagsInput } from "@/components/ui/tags-input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

interface CustomFieldFormValues {
  name: string;
  slug: string;
  description?: string;
  type: CustomFieldType;
  visibility: boolean;
  listValues: string[];
}

type CustomFieldFormProps = Readonly<{
  data?: CustomFieldData;
  onSubmitCallback: () => void;
}>;

const buildSlug = (value: string) =>
  value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^_|_$/g, "");

export const CustomFieldForm = ({ data, onSubmitCallback }: CustomFieldFormProps) => {
  const { t } = useTranslation();
  const updateCustomFieldMutation = useUpdateCustomFieldMutation();
  const createCustomFieldMutation = useCreateCustomFieldMutation();

  const customFieldFormSchema = z.object({
    name: z.string().trim().min(1, t("Name is required")),
    slug: z.string().trim().min(1, t("Slug is required")),
    description: z.string().optional(),
    type: z.enum(["multivalue", "number", "text", "email"], {
      error: t("Invalid type selected"),
    }),
    visibility: z.boolean({
      error: t("Invalid visibility value"),
    }),
    listValues: z.array(z.string()),
  });

  const form = useForm<CustomFieldFormValues>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues: {
      name: data?.name || "",
      slug: data?.slug || "",
      description: data?.description || "",
      type: data?.type || "text",
      visibility: data?.visibility ?? true,
      listValues: data?.listValues || [],
    },
  });

  const nameValue = form.watch("name");
  const typeValue = form.watch("type");
  const isPending = updateCustomFieldMutation.isPending || createCustomFieldMutation.isPending;

  useEffect(() => {
    form.reset({
      name: data?.name || "",
      slug: data?.slug || "",
      description: data?.description || "",
      type: data?.type || "text",
      visibility: data?.visibility ?? true,
      listValues: data?.listValues || [],
    });
  }, [data, form]);

  useEffect(() => {
    if (nameValue && !data) {
      form.setValue("slug", buildSlug(nameValue), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [data, form, nameValue]);

  const handleSubmit = (values: CustomFieldFormValues) => {
    if (data) {
      updateCustomFieldMutation.mutate(
        {
          fieldId: data?.id,
          data: values,
        },
        {
          onSettled() {
            form.reset();
            onSubmitCallback();
          },
        },
      );
      return;
    }

    createCustomFieldMutation.mutate(values, {
      onSettled() {
        form.reset();
        onSubmitCallback();
      },
    });
  };

  const typeOptions = [
    { value: "text", label: t("Text") },
    { value: "number", label: t("Number") },
    { value: "email", label: t("Email") },
    { value: "multivalue", label: t("Multi-value") },
  ] as const;

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup className="gap-4">
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("Name")}</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
                placeholder={t("Custom field name")}
              />
              {fieldState.invalid && (
                <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="slug"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("Field ID")}</FieldLabel>
              <Input
                {...field}
                id={field.name}
                disabled={!!data}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
                placeholder={t("Auto-generated from name")}
              />
              {fieldState.invalid && (
                <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <Controller
          name="type"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="custom-field-type">{t("Type")}</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                items={typeOptions}
              >
                <SelectTrigger
                  id="custom-field-type"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
                >
                  <SelectValue placeholder={t("Select field type")} />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && (
                <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        {typeValue === "multivalue" && (
          <Controller
            name="listValues"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="custom-field-list-values">{t("Input Values")}</FieldLabel>
                <TagsInput
                  id="custom-field-list-values"
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
                  placeholder={t("Enter values and press Enter")}
                />
                {fieldState.invalid && (
                  <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}

        <Controller
          name="visibility"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FieldLabel htmlFor="custom-field-visibility">{t("Visibility")}</FieldLabel>
                {fieldState.invalid && (
                  <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
                )}
              </FieldContent>
              <Switch
                id="custom-field-visibility"
                name={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
              />
            </Field>
          )}
        />

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("Description")}</FieldLabel>
              <Textarea
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? `${field.name}-error` : undefined}
                placeholder={t("Describe this custom field")}
              />
              {fieldState.invalid && (
                <FieldError id={`${field.name}-error`} errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />

        <DialogFooter>
          <DialogClose render={<Button variant="secondary" type="button" />}>
            <span className="text-sm font-normal">{t("Cancel")}</span>
          </DialogClose>
          <Button type="submit" loading={isPending}>
            <span className="text-sm font-normal">
              {data ? t("Update Custom Field") : t("Create Custom Field")}
            </span>
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
};
