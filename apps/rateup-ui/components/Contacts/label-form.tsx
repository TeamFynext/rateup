import { Button, Group, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { useTranslations } from "next-intl";
import z from "zod";

import { labelFormSchema } from "@/app/dashboard/contacts/labels/data/schema";
import {
  useCreateLabelMutation,
  useUpdateLabelMutation,
} from "@/backend/label/label.query";
import { showLoadingToast } from "@/utils/notifications";

import {
  ContainedColorInput,
  ContainedTextArea,
  ContainedTextField,
} from "../input/ContainedInput/ContainedInput";

export const LabelForm = ({
  data,
  close,
}: {
  data?: any;
  close: () => void;
}) => {
  const t = useTranslations();
  const updateLabelMutation = useUpdateLabelMutation();
  const createLabelMutation = useCreateLabelMutation();

  const form = useForm<z.infer<typeof labelFormSchema>>({
    initialValues: {
      name: data?.name || "",
      color: data?.color || "",
      description: data?.description || "",
    },
    validate: zodResolver(labelFormSchema),
  });

  const handleSubmit = () => {
    if (data) {
      updateLabelMutation.mutate(
        {
          labelId: data?.id,
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
        t("Contact labels updated successfully"),
        "c-label",
        true,
        t("Loading"),
      );
    } else {
      createLabelMutation.mutate(form.getValues(), {
        onSettled() {
          form.reset();
          close();
        },
      });
      showLoadingToast(
        t("Contact labels created successfully"),
        "c-label",
        true,
        t("Loading"),
      );
    }
  };
  return (
    <form onSubmit={form.onSubmit(handleSubmit)} style={{ width: "100%" }}>
      <Stack>
        <ContainedTextField
          label={t("Name")}
          placeholder={t("Label name")}
          required
          {...form.getInputProps("name")}
        />
        <ContainedColorInput
          placeholder={t("Select Color")}
          label={t("Select Color")}
          swatches={[
            "#2e2e2e",
            "#868e96",
            "#fa5252",
            "#e64980",
            "#be4bdb",
            "#7950f2",
            "#4c6ef5",
            "#228be6",
            "#15aabf",
            "#12b886",
            "#40c057",
            "#82c91e",
            "#fab005",
            "#fd7e14",
          ]}
          {...form.getInputProps("color")}
        />
        <ContainedTextArea
          label={t("Description")}
          placeholder={t("Describe this label")}
          minRows={3}
          {...form.getInputProps("description")}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={close}>
            {t("Cancel")}
          </Button>
          <Button type="submit">{t("Create Tag")}</Button>
        </Group>
      </Stack>
    </form>
  );
};
