import { ActionIcon, Box, Text } from "@mantine/core";
import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import { IconX } from "@tabler/icons-react";
import PhoneInputWithCountrySelect from "react-phone-number-input";
import { WHATSAPP_BUTTON_TYPE } from "../../../../utils/constants";
import { lexend500 } from "../../../../utils/fonts";
import { LengthTracker } from "../../../input/LengthTracker";
import "react-phone-number-input/style.css";
import styles from "./ButtonInput.module.css";
import { FlowSelector } from "../../flows/FlowSelector/FlowSelector";
import { useWaFlowsFromDb } from "../../../../backend/whatsapp/flow/flow.query";

const ButtonInput = ({ form, index, deleteButton, data }) => {
  const isFlow =
    form.values?.buttons?.[index]?.type === WHATSAPP_BUTTON_TYPE.FLOW;
  const { data: flows } = useWaFlowsFromDb(isFlow);
  if (isFlow && flows) {
    const flowId = form.values?.buttons?.[index]?.["flow_id"];
    if (flowId && flows) {
      const flow = flows.find((flow) => flow.flowId === flowId);
      if (flow) {
        const firstScreenId = flow.json.screens[0].id;

        const currentScreenId =
          form.values?.buttons?.[index]?.["navigate_screen"];
        if (currentScreenId !== firstScreenId) {
          form.setFieldValue(`buttons.${index}.navigate_screen`, firstScreenId);
          form.setFieldValue(`buttons.${index}.flow_action`, "navigate");
        }
      }
    }
  }

  switch (data.type) {
    case WHATSAPP_BUTTON_TYPE.QUICK_REPLY:
      return (
        <>
          <ContainedTextField
            label={
              <Text fz={14} ff={lexend500.style.fontFamily}>
                Button text
              </Text>
            }
            rightSection={
              <LengthTracker
                length={form.values?.buttons?.[index]?.text?.length}
                maxValue={25}
                atStart
              />
            }
            flex={1}
            {...form.getInputProps(`buttons.${index}.text`)}
          />
          <ActionIcon
            mt={24}
            variant="transparent"
            onClick={() => deleteButton(index)}
          >
            <IconX />
          </ActionIcon>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE:
      return (
        <>
          <ContainedTextField
            label={
              <Text fz={14} ff={lexend500.style.fontFamily}>
                Type of action
              </Text>
            }
            value={"Visit a Website"}
            readOnly
          />
          <ContainedTextField
            label={
              <Text fz={14} ff={lexend500.style.fontFamily}>
                Button text
              </Text>
            }
            rightSection={
              <LengthTracker
                length={form.values?.buttons?.[index]?.text?.length}
                maxValue={25}
                atStart
              />
            }
            {...form.getInputProps(`buttons.${index}.text`)}
          />
          <ContainedTextField
            label={
              <Text fz={14} ff={lexend500.style.fontFamily}>
                Website Url
              </Text>
            }
            rightSection={
              <LengthTracker
                length={form.values?.buttons?.[index]?.text?.length}
                maxValue={2000}
                atStart
              />
            }
            flex={1}
            {...form.getInputProps(`buttons.${index}.url`)}
            type="url"
          />
          <ActionIcon
            mt={24}
            variant="transparent"
            onClick={() => deleteButton(index)}
          >
            <IconX />
          </ActionIcon>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER:
      return (
        <>
          <>
            <ContainedTextField
              label={
                <Text fz={14} ff={lexend500.style.fontFamily}>
                  Type of action
                </Text>
              }
              value={"Call phone number"}
              readOnly
            />
            <ContainedTextField
              label={
                <Text fz={14} ff={lexend500.style.fontFamily}>
                  Button text
                </Text>
              }
              rightSection={
                <LengthTracker
                  length={form.values?.buttons?.[index]?.text?.length}
                  maxValue={25}
                  atStart
                />
              }
              {...form.getInputProps(`buttons.${index}.text`)}
            />
            <Box flex={1}>
              <Text>Phone Number</Text>
              <PhoneInputWithCountrySelect
                defaultCountry="IN"
                international
                countryCallingCodeEditable={false}
                placeholder="Enter phone number"
                value={form?.values?.phone || null}
                {...form.getInputProps(`buttons.${index}.phone_number`)}
                className={styles.inputPhone}
              />
              {/* {form} */}
            </Box>
            <ActionIcon
              mt={24}
              variant="transparent"
              onClick={() => deleteButton(index)}
            >
              <IconX />
            </ActionIcon>
          </>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE:
      return (
        <>
          <ContainedTextField
            label={
              <Text fz={14} ff={lexend500.style.fontFamily}>
                Type of action
              </Text>
            }
            value={"Copy offer code"}
            readOnly
          />
          <ContainedTextField
            label={
              <Text fz={14} ff={lexend500.style.fontFamily}>
                Button text
              </Text>
            }
            value={"Copy offer code"}
            disabled
            rightSection={<div></div>}
          />
          <ContainedTextField
            label={
              <Text fz={14} ff={lexend500.style.fontFamily}>
                Offer code
              </Text>
            }
            placeholder="Enter sample code"
            rightSection={
              <LengthTracker
                length={form.values?.buttons?.[index]?.text?.length}
                maxValue={15}
                atStart
              />
            }
            flex={1}
            {...form.getInputProps(`buttons.${index}.example`)}
          />
          <ActionIcon
            mt={24}
            variant="transparent"
            onClick={() => deleteButton(index)}
          >
            <IconX />
          </ActionIcon>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.FLOW:
      return (
        <>
          <ContainedTextField
            label={
              <Text fz={14} ff={lexend500.style.fontFamily}>
                Type of action
              </Text>
            }
            value={"Open a Flow"}
            readOnly
          />
          <ContainedTextField
            label={
              <Text fz={14} ff={lexend500.style.fontFamily}>
                Button text
              </Text>
            }
            rightSection={
              <LengthTracker
                length={form.values?.buttons?.[index]?.text?.length}
                maxValue={25}
                atStart
              />
            }
            {...form.getInputProps(`buttons.${index}.text`)}
          />
          <FlowSelector
            onlyPublished
            id={"flowId"}
            {...form.getInputProps(`buttons.${index}.flow_id`)}
            label={
              <Text fz={14} ff={lexend500.style.fontFamily}>
                Flow
              </Text>
            }
            comboboxProps={{ position: "top" }}
          />
          <ActionIcon
            mt={24}
            variant="transparent"
            onClick={() => deleteButton(index)}
          >
            <IconX />
          </ActionIcon>
        </>
      );

    default:
      return <></>;
  }
};
export default ButtonInput;
