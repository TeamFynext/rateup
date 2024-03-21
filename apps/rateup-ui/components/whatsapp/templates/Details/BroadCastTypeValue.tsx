import { Text } from "@mantine/core";
import { WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "../../../../utils/constants";
import { lexend500 } from "../../../../utils/fonts";
import {
  ContainedTextField,
  ContainedFileButton,
} from "../../../input/ContainedInput/ContainedInput";
import { LengthTracker } from "../../../input/LengthTracker";

export const BroadCastTypeValue = ({ form, type }) => {
  switch (type) {
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE[1]:
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
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE[2]:
      return (
        <ContainedFileButton
          label={"Image"}
          mt={"xl"}
          placeholder={"Select an image"}
          {...form.getInputProps("header")}
          accept="image/jpeg,image/jpg,image/png"
        />
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE[3]:
      return (
        <ContainedFileButton
          label={"Video"}
          mt={"xl"}
          placeholder={"Select an Video"}
          {...form.getInputProps("header")}
          accept="video/mp4"
        />
      );
    case WHATSAPP_TEMPLATE_BROADCAST_TYPE[4]:
      return (
        <ContainedFileButton
          label={"Document"}
          mt={"xl"}
          placeholder={"Select an Document"}
          {...form.getInputProps("header")}
          accept="application/pdf"
        />
      );
    default:
      break;
  }
};
