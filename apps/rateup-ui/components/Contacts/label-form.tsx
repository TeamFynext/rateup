import { useEffect } from "react";

import { Select, TagsInput } from "@mantine/core";
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
import { Button } from "../ui/button";
import { DialogClose, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";

export const CustomFieldForm = ({
  data,
  onSubmitCallback,
}: {
  data?: any;
  onSubmitCallback: () => void;
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
            onSubmitCallback();
          },
        },
      );
    } else {
      createCustomFieldMutation.mutate(form.getValues(), {
        onSettled() {
          form.reset();
          onSubmitCallback();
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
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <Label>{t("Name")}</Label>
          <Input
            placeholder={t("Custom field name")}
            required
            {...form.getInputProps("name")}
          />
        </div>
        <div className="space-y-1">
          <Label>{t("Field ID")}</Label>
          <Input
            placeholder={t("Auto-generated from name")}
            required
            disabled={!!data}
            {...form.getInputProps("slug")}
          />
        </div>

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
        <div className="space-y-1">
          <Label>{t("Description")}</Label>
          <Textarea
            placeholder={t("Describe this custom field")}
            {...form.getInputProps("description")}
          />
        </div>
        <DialogFooter>
          <DialogClose>
            <Button variant="secondary">
              <span className="text-sm font-normal">{t("Cancel")}</span>
            </Button>
          </DialogClose>
          <Button type="submit">
            {(updateCustomFieldMutation.isPending ||
              createCustomFieldMutation.isPending) && <Spinner />}
            <span className="text-sm font-normal">
              {data ? t("Update Custom Field") : t("Create Custom Field")}
            </span>
          </Button>
        </DialogFooter>
      </div>
    </form>
  );
};
