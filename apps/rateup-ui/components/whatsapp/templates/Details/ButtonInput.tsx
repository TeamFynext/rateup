import { ActionIcon, Box, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import PhoneInputWithCountrySelect from "react-phone-number-input";

import { WHATSAPP_BUTTON_TYPE } from "../../../../utils/constants";
import { ContainedTextField } from "../../../input/ContainedInput/ContainedInput";
import { LengthTracker } from "../../../input/LengthTracker";

import "react-phone-number-input/style.css";

import useTranslations from "@/dictionaries/useTranslation";

import { useWaFlowsFromDb } from "../../../../backend/whatsapp/flow/flow.query";
import { FlowSelector } from "../../flows/FlowSelector/FlowSelector";
import { WebsurveySelector } from "../../flows/WebsurveySelector/WebsurveySelector";
import styles from "./ButtonInput.module.css";

const ButtonInput = ({ form, index, deleteButton, data }) => {
  const { translations } = useTranslations();
  let { data: flows } = useWaFlowsFromDb(
    data.type === WHATSAPP_BUTTON_TYPE.FLOW,
  );
  if (data.type === WHATSAPP_BUTTON_TYPE.FLOW) {
    const screeenId = flows?.find(
      (data) => data.flowId === form?.values?.buttons?.[index]?.flow_id,
    )?.json?.screens?.[0]?.id;
    if (screeenId) {
      data["navigate_screen"] = screeenId;
    }
  }

  switch (data.type) {
    case WHATSAPP_BUTTON_TYPE.QUICK_REPLY:
      return (
        <>
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Button text"]}
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
              <Text fz={14} fw={500}>
                {translations["Type of action"]}
              </Text>
            }
            value={
              form?.values?.buttons?.[index]?.example
                ? translations["RateUp Web Survey"]
                : translations["Visit a Website"]
            }
            readOnly
          />
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Button text"]}
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
          {form?.values?.buttons?.[index]?.example ? (
            <WebsurveySelector
              onlyPublished
              searchable
              label={
                <Text fz={14} fw={500}>
                  {translations["Web Survey"]}
                </Text>
              }
              comboboxProps={{ position: "top" }}
              form={form}
              index={index}
            />
          ) : (
            <ContainedTextField
              label={
                <Text fz={14} fw={500}>
                  {translations["Website Url"]}
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
          )}
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
                <Text fz={14} fw={500}>
                  {translations["Type of action"]}
                </Text>
              }
              value={"Call phone number"}
              readOnly
            />
            <ContainedTextField
              label={
                <Text fz={14} fw={500}>
                  {translations["Button text"]}
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
              <Text>{translations["Phone Number"]}</Text>
              <PhoneInputWithCountrySelect
                defaultCountry="IN"
                international
                countryCallingCodeEditable={false}
                placeholder={translations["Enter phone number"]}
                value={form?.values?.phone || null}
                {...form.getInputProps(`buttons.${index}.phone_number`)}
                className={
                  form?.errors?.[`buttons.${index}.phone_number`]
                    ? styles.inputError
                    : styles.inputPhone
                }
              />
              <Text fz={"xs"} c={"var(--mantine-color-red-6)"}>
                {form?.errors?.[`buttons.${index}.phone_number`]}
              </Text>
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
              <Text fz={14} fw={500}>
                {translations["Type of action"]}
              </Text>
            }
            value={"Copy offer code"}
            readOnly
          />
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Button text"]}
              </Text>
            }
            value={"Copy offer code"}
            disabled
            rightSection={<div></div>}
          />
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Offer code"]}
              </Text>
            }
            placeholder={translations["Enter sample code"]}
            rightSection={
              <LengthTracker
                length={form.values?.buttons?.[index]?.example?.length}
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
              <Text fz={14} fw={500}>
                {translations["Type of action"]}
              </Text>
            }
            value={"Open a Flow"}
            readOnly
          />
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Button text"]}
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
            searchable
            label={
              <Text fz={14} fw={500}>
                {translations["Flow"]}
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
    case WHATSAPP_BUTTON_TYPE.ORDER_DETAILS:
      return (
        <>
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Type of action"]}
              </Text>
            }
            value={"Open order details"}
            readOnly
          />
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Button text"]}
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
            disabled
          />
        </>
      );
    case WHATSAPP_BUTTON_TYPE.CATALOG:
      return (
        <>
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Type of action"]}
              </Text>
            }
            value={"View catalog"}
            readOnly
          />
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Button text"]}
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
            readOnly
          />
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {"Thumbnail product retailer id"}
              </Text>
            }
            {...form.getInputProps(
              "defaultValues.catalog.thumbnail_product_retailer_id",
            )}
          />
        </>
      );
    default:
      return <></>;
  }
};
export default ButtonInput;
