"use client";

import { Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useUpdateWaSettingsMutation } from "@/backend/whatsapp/settings/waSettings.query";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import FormModalLayout from "@/components/Modal/FormModalLayout";

type WaSetting = WaSettings[number];

export const WaSettingEditModal = ({
  opened,
  close,
  waSetting,
}: Readonly<{
  opened: boolean;
  close: () => void;
  waSetting: WaSetting | null;
}>) => {
  const updatemut = useUpdateWaSettingsMutation(waSetting?.id);
  const form = useForm({
    initialValues: {
      phoneDisplayName: waSetting?.phoneDisplayName || "",
    },
  });

  function handleSubmit() {
    updatemut.mutate(form.values, { onSuccess: () => close() });
  }

  if (!waSetting) return null;

  return (
    <FormModalLayout
      centered
      isLoading={updatemut.isPending}
      customHeader={<Text>Edit Configuration</Text>}
      title=""
      buttonTitle="save"
      includeCancelButton
      cancelOnClick={close}
      opened={opened}
      onClose={close}
      onSubmit={handleSubmit}
    >
      <Stack>
        <ContainedTextField
          {...form.getInputProps("phoneDisplayName")}
          label="Display name for whatsapp phone number"
        />
      </Stack>
    </FormModalLayout>
  );
};
