"use client";

import { useCallback } from "react";

import { useForm } from "@mantine/form";
import { useTranslations } from "next-intl";

import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import FormModalLayout from "@/components/Modal/FormModalLayout";

import useFlowStore from "../utils/store";

interface CreateFlowScreenModalProps {
  opened: boolean;
  close: () => void;
  screenId?: string;
}
function CreateFlowScreenModal({
  opened,
  close,
  screenId = null,
}: Readonly<CreateFlowScreenModalProps>) {
  const translations = useTranslations();
  const flow = useFlowStore();
  const form = useForm({
    initialValues: {
      title: "",
    },
    mode: "uncontrolled",
    validate: {
      title: (value) => {
        if (value === "") return translations("Screen Title is required");
        else return null;
      },
    },
  });

  const handleCreate = useCallback(
    (values) => {
      flow.addScreenWithTitle(values?.title);
      form.reset();
      close();
    },
    [close, flow],
  );

  return (
    <FormModalLayout
      opened={opened}
      title={
        screenId ? translations("Edit Screen") : translations("Create Screen")
      }
      onClose={close}
      centered
      onSubmit={form.onSubmit(handleCreate)}
      buttonTitle={screenId ? translations("Edit") : translations("Create")}
    >
      <ContainedTextField
        placeholder={translations("Enter Screen Title")}
        {...form.getInputProps("title")}
      />
    </FormModalLayout>
  );
}

export default CreateFlowScreenModal;
