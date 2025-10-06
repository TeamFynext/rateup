import { useEffect } from "react";

import { Button, Group, Select, Stack, TagsInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import z from "zod";

import {
  useCreateCustomFieldMutation,
  useUpdateCustomFieldMutation,
} from "@/backend/campaign/contacts/contacts.query";

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
  const updateCustomFieldMutation = useUpdateCustomFieldMutation();
  const createCustomFieldMutation = useCreateCustomFieldMutation();

  const customFieldFormSchema = z.object({
    name: z.string().min(1, t("Name is required")),
    slug: z.string().min(1, t("Slug is required")),
    description: z.string().optional(),
    type: z.enum(["multivalue", "number", "text", "email"], {
      required_error: t("Type is required"),
    }),
    visibility: z.boolean({
      required_error: t("Visibility is required"),
    }),
    listValues: z.array(z.string()).optional(),
  });

  const form = useForm<z.infer<typeof customFieldFormSchema>>({
    initialValues: {
      name: data?.name || "",
      slug: data?.slug || "",
      description: data?.description || "",
      type: data?.type || "text",
      visibility: data?.visibility ?? true,
      listValues: data?.listValues || [],
    },
    validate: zodResolver(customFieldFormSchema),
  });

  // Auto-generate fieldId from name
  useEffect(() => {
    const name = form.values.name;
    if (name && !data) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      form.setFieldValue("slug", slug);
    }
  }, [form.values.name, data]);

  const handleSubmit = () => {
    if (data) {
      updateCustomFieldMutation.mutate(
        {
          fieldId: data?.id,
          data: form.getValues(),
        },
        {
          onSettled() {
            form.reset();
            close();
          },
        },
      );
    } else {
      createCustomFieldMutation.mutate(form.getValues(), {
        onSettled() {
          form.reset();
          close();
        },
      });
    }
  };

  const typeOptions = [
    { value: "text", label: t("Text") },
    { value: "number", label: t("Number") },
    { value: "email", label: t("Email") },
    { value: "multivalue", label: t("Multi-value") },
  ];

  const visibilityOptions = [
    { value: "true", label: t("Show") },
    { value: "false", label: t("Hide") },
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
          {...form.getInputProps("slug")}
        />
        <Select
          label={t("Type")}
          placeholder={t("Select field type")}
          data={typeOptions}
          required
          {...form.getInputProps("type")}
        />
        {form.values.type === "multivalue" && (
          <TagsInput
            label={t("Input Values")}
            placeholder={t("Enter values and press Enter")}
            {...form.getInputProps("listValues")}
          />
        )}
        <Select
          label={t("Visibility")}
          placeholder={t("Select visibility")}
          data={visibilityOptions}
          required
          value={form.values.visibility ? "true" : "false"}
          onChange={(value) =>
            form.setFieldValue("visibility", value === "true")
          }
          error={form.errors.visibility}
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
