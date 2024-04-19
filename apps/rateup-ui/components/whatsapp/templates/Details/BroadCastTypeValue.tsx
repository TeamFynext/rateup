import { Text } from "@mantine/core";
import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "../../../../utils/constants";
import { lexend500 } from "../../../../utils/fonts";
import {
  ContainedTextField,
  ContainedFileButton,
} from "../../../input/ContainedInput/ContainedInput";
import { LengthTracker } from "../../../input/LengthTracker";
import { getLabel } from "../../../../utils/file-upload/upload";

export const BroadCastTypeValue = ({ form, type }) => {
  const style = {
    maxWidth: 400,
  };
  switch (type) {
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.TEXT:
      return (
        <ContainedTextField
          label={
            <Text fz={14} ff={lexend500.style.fontFamily}>
              Text
            </Text>
          }
          mt={"md"}
          placeholder="Header"
          {...form.getInputProps("header")}
          rightSection={
            <LengthTracker
              length={form?.values?.header?.length}
              maxValue={60}
              atStart
            />
          }
        />
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE:
      return (
        <ContainedFileButton
          label={getLabel(form.values.header, "Image")}
          mt={"xl"}
          placeholder={"Select an image"}
          {...form.getInputProps("header")}
          accept="image/jpeg,image/jpg,image/png"
          style={style}
        />
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO:
      return (
        <ContainedFileButton
          label={getLabel(form.values.header, "Video")}
          mt={"xl"}
          placeholder={"Select an Video"}
          {...form.getInputProps("header")}
          accept="video/mp4"
          style={style}
        />
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE.DOCUMENT:
      return (
        <ContainedFileButton
          label={getLabel(form.values.header, "Document")}
          mt={"xl"}
          placeholder={"Select an Document"}
          {...form.getInputProps("header")}
          accept="application/pdf"
          style={style}
        />
      );
    default:
      break;
  }
};
