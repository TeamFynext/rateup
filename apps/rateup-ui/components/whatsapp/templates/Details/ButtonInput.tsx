import { ActionIcon, Box, Divider, Group, Stack, Text } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import PhoneInputWithCountrySelect from "react-phone-number-input";

import { WHATSAPP_BUTTON_TYPE } from "../../../../utils/constants";
import {
  ContainedDateTimePickerInput,
  ContainedMultiSelect,
  ContainedNumberInput,
  ContainedSelection,
  ContainedTextField,
} from "../../../input/ContainedInput/ContainedInput";
import { LengthTracker } from "../../../input/LengthTracker";

import "react-phone-number-input/style.css";

import { UseFormReturnType } from "@mantine/form";
import { z } from "zod";

import { useWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { RateupButtonSecondary } from "@/components/Button/RateupButtons";
import useTranslations from "@/dictionaries/useTranslation";

import { useWaFlowsFromDb } from "../../../../backend/whatsapp/flow/flow.query";
import { FlowSelector } from "../../flows/FlowSelector/FlowSelector";
import { WebsurveySelector } from "../../flows/WebsurveySelector/WebsurveySelector";
import { templateSchema } from "../Schema/templateSchema";
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
  const { connectedCatalog } = useWaCatalog();
  const { data: catalog } = connectedCatalog;
  const productRetailerIds = catalog
    ? catalog?.products?.map((p) => p.retailer_id)
    : [];

  function handleAddMPMSections() {
    const defaultValues = form.values.defaultValues ?? {};
    const catalog = defaultValues?.catalog ?? {
      thumbnail_product_retailer_id: "",
    };
    const mpm = catalog?.mpm
      ? {
          ...catalog?.mpm,
          sections: [...catalog?.mpm?.sections, { title: "", products: [] }],
        }
      : {
          sections: [{ title: "", products: [] }],
        };
    form.setFieldValue("defaultValues", {
      ...defaultValues,
      catalog: { ...catalog, mpm },
    });
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
        <Stack>
          <Group>
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
            {form.values.category === "MARKETING" && (
              <ActionIcon
                mt={24}
                variant="transparent"
                onClick={() => {
                  deleteButton(index);
                }}
              >
                <IconX />
              </ActionIcon>
            )}
          </Group>
          {form.values.category === "MARKETING" && (
            <OrderDetailsButtonForm form={form} />
          )}
        </Stack>
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
          <ActionIcon
            mt={24}
            variant="transparent"
            onClick={() => {
              form.setFieldValue(
                "defaultValues.catalog.thumbnail_product_retailer_id",
                "",
              );
              deleteButton(index);
            }}
          >
            <IconX />
          </ActionIcon>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.MPM:
      return (
        <Stack>
          <Group>
            <ContainedTextField
              label={
                <Text fz={14} fw={500}>
                  {translations["Type of action"]}
                </Text>
              }
              value={"View Catalog items"}
              readOnly
            />
            <ContainedTextField
              label={
                <Text fz={14} fw={500}>
                  {translations["Button text"]}
                </Text>
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
            <ActionIcon
              mt={24}
              variant="transparent"
              onClick={() => {
                form.setFieldValue("defaultValues.catalog", {
                  thumbnail_product_retailer_id: "",
                  mpm: {
                    sections: [],
                  },
                  spm: {
                    product_retailer_id: "",
                  },
                });
                deleteButton(index);
              }}
            >
              <IconX />
            </ActionIcon>
          </Group>
          <RateupButtonSecondary
            radius={"md"}
            w={"fit-content"}
            leftIcon={<IconPlus size={15} />}
            rightIcon={<IconChevronDown size={15} />}
            title="Add Sections"
            onClick={handleAddMPMSections}
          />
          {form.values.defaultValues?.catalog?.mpm?.sections?.map(
            (sec, index) => (
              <Group
                bg={"var(--light-grey-color-4)"}
                p={"md"}
                key={index}
                style={{ borderRadius: "10px" }}
              >
                <ContainedTextField
                  label={
                    <Text fz={14} fw={500}>
                      Section Title
                    </Text>
                  }
                  key={form.key(
                    `defaultValues.catalog.mpm.sections.${index}.title`,
                  )}
                  {...form.getInputProps(
                    `defaultValues.catalog.mpm.sections.${index}.title`,
                  )}
                />
                <ContainedMultiSelect
                  data={productRetailerIds}
                  label={
                    <Text fz={14} fw={500}>
                      {"Product Retailer Ids"}
                    </Text>
                  }
                  {...form.getInputProps(
                    `defaultValues.catalog.mpm.sections.${index}.products`,
                  )}
                  nothingFoundMessage={"products not found"}
                />
                <ActionIcon
                  mt={24}
                  variant="transparent"
                  onClick={() =>
                    form.removeListItem(
                      "defaultValues.catalog.mpm.sections",
                      index,
                    )
                  }
                >
                  <IconTrash color="red" size={15} />
                </ActionIcon>
              </Group>
            ),
          )}
        </Stack>
      );
    case WHATSAPP_BUTTON_TYPE.SPM:
      return (
        <>
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Type of action"]}
              </Text>
            }
            value={"View Single Product"}
            readOnly
          />
          <ContainedTextField
            label={
              <Text fz={14} fw={500}>
                {translations["Button text"]}
              </Text>
            }
            {...form.getInputProps(`buttons.${index}.text`)}
            readOnly
          />
          <ContainedSelection
            data={productRetailerIds}
            label={
              <Text fz={14} fw={500}>
                {"Product retailer id"}
              </Text>
            }
            {...form.getInputProps(
              "defaultValues.catalog.spm.product_retailer_id",
            )}
          />
          <ActionIcon
            mt={24}
            variant="transparent"
            onClick={() => {
              form.setFieldValue(
                "defaultValues.catalog.spm.product_retailer_id",
                "",
              );
              deleteButton(index);
            }}
          >
            <IconX />
          </ActionIcon>
        </>
      );
    default:
      return <></>;
  }
};

const OrderDetailsButtonForm = ({
  form,
}: {
  form: UseFormReturnType<z.infer<typeof templateSchema>>;
}) => {
  return (
    <Stack>
      <Group>
        <ContainedSelection
          data={["physical-goods", "digital-goods"]}
          {...form.getInputProps("defaultValues.orderDetails.productType")}
          label={"Product Type"}
        />
        <ContainedTextField
          {...form.getInputProps("defaultValues.orderDetails.item.name")}
          label={"Product Name"}
        />
        <ContainedNumberInput
          allowNegative={false}
          {...form.getInputProps("defaultValues.orderDetails.item.price")}
          label={"Product Price"}
        />
        <ContainedNumberInput
          allowNegative={false}
          {...form.getInputProps("defaultValues.orderDetails.item.salePrice")}
          label={"Product Sale Price"}
        />
        <ContainedNumberInput
          allowNegative={false}
          allowDecimal={false}
          {...form.getInputProps("defaultValues.orderDetails.item.quantity")}
          label={"Quantity"}
        />
        <ContainedTextField
          {...form.getInputProps("defaultValues.orderDetails.item.origin")}
          label={"Country of origin"}
        />
      </Group>
      <Divider label={"Product Importer Info"} />
      <Group>
        <ContainedTextField
          {...form.getInputProps(
            "defaultValues.orderDetails.item.importerName",
          )}
          label={"Importer Name"}
        />
        <ContainedTextField
          {...form.getInputProps(
            "defaultValues.orderDetails.item.importerAddress1",
          )}
          label={"Importer Address"}
        />
        <ContainedTextField
          {...form.getInputProps(
            "defaultValues.orderDetails.item.importerCity",
          )}
          label={"City"}
        />
        <ContainedTextField
          {...form.getInputProps(
            "defaultValues.orderDetails.item.importerPostalCode",
          )}
          label={"Postal Code"}
        />
        <ContainedTextField
          {...form.getInputProps(
            "defaultValues.orderDetails.item.importerZoneCode",
          )}
          label={"Zone Code"}
        />
      </Group>
      <Divider />
      <Group>
        <ContainedNumberInput
          allowNegative={false}
          {...form.getInputProps("defaultValues.orderDetails.shipping")}
          label={"Shipping Amount"}
        />
        <ContainedNumberInput
          allowNegative={false}
          {...form.getInputProps("defaultValues.orderDetails.tax")}
          label={"Tax amount"}
        />
        <ContainedTextField
          {...form.getInputProps("defaultValues.orderDetails.taxDescription")}
          label={"Tax Description"}
        />
        <ContainedNumberInput
          allowNegative={false}
          allowDecimal={false}
          {...form.getInputProps("defaultValues.orderDetails.discount")}
          label={"Discount Amount"}
        />
        <ContainedTextField
          {...form.getInputProps(
            "defaultValues.orderDetails.discountDiscription",
          )}
          label={"Discount Description"}
        />
        <ContainedDateTimePickerInput
          clearable
          {...form.getInputProps("defaultValues.orderDetails.expiry")}
          label={"Expiry Date"}
        />
      </Group>
      <Divider label={"Payment Info"} />
      <Group>
        <ContainedSelection
          data={["razorpay", "payu", "zaakpay"]}
          {...form.getInputProps("defaultValues.orderDetails.paymentType")}
          label={"Payment gateway name"}
          description={
            "Name of payment gateway you have configured on your WhatsApp Business Account"
          }
        />
        <ContainedTextField
          {...form.getInputProps(
            "defaultValues.orderDetails.paymentConfigName",
          )}
          label={"Payment gateway configuration name"}
          description={
            "Configuration name of payment gateway you have configured on your WhatsApp Business Account"
          }
        />
      </Group>
    </Stack>
  );
};
export default ButtonInput;
