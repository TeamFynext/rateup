import { useEffect } from "react";

import { Button, Group, Select, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import z from "zod";

// import {
//   useCreateCustomFieldMutation,
//   useUpdateCustomFieldMutation,
// } from "@/backend/label/label.query";
import { showLoadingToast } from "@/utils/notifications";

import {
  ContainedTextArea,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";

export const CustomFieldForm = ({
  data,
  close,
}: {
  data?: any;
  close: () => void;
}) => {
  const t = useTranslations();
  let updateCustomFieldMutation: any;
  // = useUpdateCustomFieldMutation();
  let createCustomFieldMutation: any;
  //  = useCreateCustomFieldMutation();

  const customFieldFormSchema = z.object({
    name: z.string().min(1, t("Name is required")),
    fieldId: z.string().min(1, t("Field ID is required")),
    description: z.string().optional(),
    type: z.enum(["multivalue", "number", "text", "email"], {
      required_error: t("Type is required"),
    }),
    visibility: z.enum(["show", "hide"], {
      required_error: t("Visibility is required"),
    }),
  });

  const form = useForm<z.infer<typeof customFieldFormSchema>>({
    initialValues: {
      name: data?.name || "",
      fieldId: data?.fieldId || "",
      description: data?.description || "",
      type: data?.type || "text",
      visibility: data?.visibility || "show",
    },
    validate: zodResolver(customFieldFormSchema),
  });

  // Auto-generate fieldId from name
  useEffect(() => {
    const name = form.values.name;
    if (name && !data) {
      const fieldId = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      form.setFieldValue("fieldId", fieldId);
    }
  }, [form.values.name, data]);

  const handleSubmit = () => {
    if (data) {
      updateCustomFieldMutation.mutate(
        {
          customFieldId: data?.id,
          data: form.getValues(),
        },
        {
          onSettled() {
            form.reset();
            close();
          },
        },
      );
      showLoadingToast(
        t("Custom field updated successfully"),
        "c-customfield",
        true,
        t("Loading"),
      );
    } else {
      createCustomFieldMutation.mutate(form.getValues(), {
        onSettled() {
          form.reset();
          close();
        },
      });
      showLoadingToast(
        t("Custom field created successfully"),
        "c-customfield",
        true,
        t("Loading"),
      );
    }
  };

  const typeOptions = [
    { value: "text", label: t("Text") },
    { value: "number", label: t("Number") },
    { value: "email", label: t("Email") },
    { value: "multivalue", label: t("Multi-value") },
  ];

  const visibilityOptions = [
    { value: "show", label: t("Show") },
    { value: "hide", label: t("Hide") },
  ];

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} style={{ width: "100%" }}>
      <Stack>
        <ContainedTextField
          label={t("Name")}
          placeholder={t("Custom field name")}
          required
          {...form.getInputProps("name")}
        />
        <ContainedTextField
          label={t("Field ID")}
          placeholder={t("Auto-generated from name")}
          required
          disabled={!!data}
          {...form.getInputProps("fieldId")}
        />
        <Select
          label={t("Type")}
          placeholder={t("Select field type")}
          data={typeOptions}
          required
          {...form.getInputProps("type")}
        />
        <Select
          label={t("Visibility")}
          placeholder={t("Select visibility")}
          data={visibilityOptions}
          required
          {...form.getInputProps("visibility")}
        />
        <ContainedTextArea
          label={t("Description")}
          placeholder={t("Describe this custom field")}
          minRows={3}
          {...form.getInputProps("description")}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={close}>
            {t("Cancel")}
          </Button>
          <Button type="submit">
            {data ? t("Update Custom Field") : t("Create Custom Field")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
