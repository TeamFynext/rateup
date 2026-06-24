import { Text } from "@mantine/core";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "@/utils/constants.ts";
import { getLabel } from "@/utils/file-upload/upload.ts";

import {
  ContainedFileButton,
  ContainedTextField,
} from "../../../input/ContainedInput/ContainedInput.tsx";
import { LengthTracker } from "../../../input/LengthTracker.tsx";

const FILE_CONFIG = {
  [WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE]: {
    accept: "image/jpeg,image/jpg,image/png",
    maxSize: 5 * 1024 * 1024,
    label: "Image",
    helper: "Max file size is 5MB",
    sizeText: "5MB",
  },
  [WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO]: {
    accept: "video/mp4",
    maxSize: 16 * 1024 * 1024,
    label: "Video",
    helper: "Max file size is 16MB",
    sizeText: "16MB",
  },
  [WHATSAPP_TEMPLATE_BROADCAST_TYPE.DOCUMENT]: {
    accept: "application/pdf",
    maxSize: 100 * 1024 * 1024,
    label: "Document",
    helper: "Max file size is 100MB",
    sizeText: "100MB",
  },
};

export const BroadCastTypeValue = ({ form, type }) => {
  const { t: translations } = useTranslation();
  const resetRef = useRef<() => void>(null);
  const style = {
    maxWidth: 400,
  };

  if (type === WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT) {
    return (
      <ContainedTextField
        label={
          <Text fz={14} fw={500}>
            Text
          </Text>
        }
        mt={"md"}
        placeholder={translations("Header")}
        {...form.getInputProps("header")}
        rightSection={<LengthTracker length={form?.values?.header?.length} maxValue={60} atStart />}
      />
    );
  }
  const config = FILE_CONFIG[type];
  if (!config) return null;
  return (
    <ContainedFileButton
      resetRef={resetRef}
      label={getLabel(form.values.header, config.label)}
      mt={"xl"}
      placeholder={`Select a ${config.label}`}
      {...form.getInputProps("header")}
      accept={config.accept}
      style={style}
      helperText={config.helper}
      onChange={(file) => {
        if (!file) return;

        if (file.size > config.maxSize) {
          toast.error(`${config.label} must be smaller than ${config.sizeText}`);
          form.setFieldValue("header", null);
          resetRef.current?.();
          return;
        }

        form.setFieldValue("header", file);
      }}
    />
  );
};
