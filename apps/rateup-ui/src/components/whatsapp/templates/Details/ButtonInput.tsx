import { IconChevronDown, IconPlus, IconTrash, IconVariable, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import PhoneInputWithCountrySelect from "react-phone-number-input";
import type { z } from "zod/v4";

import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import type { BridgedForm } from "@/hooks/useBridgedForm";
import { WHATSAPP_BUTTON_TYPE } from "@/utils/constants.ts";
import { toSelectOptions } from "@/utils/select-options.ts";

import { LengthTracker } from "../../../input/LengthTracker.tsx";
import { Field, FieldDescription, FieldLabel } from "../../../ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../../../ui/input-group.tsx";
import { Input } from "../../../ui/input.tsx";
import { MultiSelect } from "../../../ui/multi-select.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select.tsx";
import { FlowSelector } from "../../flows/FlowSelector/FlowSelector.tsx";
import { WebsurveySelector } from "../../flows/WebsurveySelector/WebsurveySelector.tsx";
import type { templateSchema } from "../Schema/templateSchema.ts";
import { useButtonState } from "./useButtonState.ts";

import styles from "./ButtonInput.module.css";

const ButtonInput = ({ form, index, deleteButton, data, catalog, productRetailerIds }) => {
  const { t: translations } = useTranslation();
  const { data: flows } = useWaFlowsFromDb(data.type === WHATSAPP_BUTTON_TYPE.FLOW);
  const buttonState = useButtonState({
    url: form.values?.buttons?.[index]?.url,
    example: form.values?.buttons?.[index]?.example,
  });
  if (data.type === WHATSAPP_BUTTON_TYPE.FLOW) {
    const screeenId = flows?.find((data) => data.flowId === form?.values?.buttons?.[index]?.flow_id)
      ?.json?.screens?.[0]?.id;
    if (screeenId) {
      data["navigate_screen"] = screeenId;
    }
  }

  function handleAddMPMSections() {
    const defaultValues = form.values.defaultValues ?? {};
    const catalog = defaultValues?.catalog ?? {
      thumbnail_product_retailer_id: "",
    };
    const mpm = catalog?.mpm
      ? {
          ...catalog?.mpm,
          sections: [...(catalog?.mpm?.sections ?? []), { title: "", products: [] }],
        }
      : {
          sections: [{ title: "", products: [] }],
        };
    form.setFieldValue("defaultValues", {
      ...defaultValues,
      catalog: { ...catalog, mpm },
    });
  }
  let type = data.type;
  if (data?.url?.includes("COPY_CODE")) {
    type = WHATSAPP_BUTTON_TYPE.OTP;
  }

  switch (type) {
    case WHATSAPP_BUTTON_TYPE.QUICK_REPLY:
      return (
        <>
          <Field className="flex-1">
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput {...form.getFieldProps(`buttons.${index}.text`)} />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.values?.buttons?.[index]?.text?.length}
                  maxValue={25}
                  atStart
                />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteButton(index)}>
            <IconX />
          </Button>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE:
      return (
        <div className="grid">
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input
              value={
                buttonState.isWebSurvey
                  ? translations("RateUp Web Survey")
                  : translations("Visit a Website")
              }
              readOnly
            />
          </Field>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput {...form.getFieldProps(`buttons.${index}.text`)} />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.values?.buttons?.[index]?.text?.length}
                  maxValue={25}
                  atStart
                />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          {buttonState.isWebSurvey ? (
            <WebsurveySelector
              onlyPublished
              searchable
              label={<p className="text-sm font-medium">{translations("Web Survey")}</p>}
              form={form}
              index={index}
            />
          ) : (
            <>
              <Field className="flex-1">
                <FieldLabel>
                  <p className="text-sm font-medium">{translations("Website Url")}</p>
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput type="url" {...form.getFieldProps(`buttons.${index}.url`)} />
                  <InputGroupAddon align="inline-end">
                    <div className="flex items-center gap-2.5">
                      {buttonState.showInsertIcon && (
                        <CustomTooltip
                          content={<span>{""}</span>}
                          trigger={
                            <span>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  const currentUrl = form.values?.buttons?.[index]?.url || "";
                                  form.setFieldValue(`buttons.${index}.url`, currentUrl + "{{1}}");
                                }}
                              >
                                <IconVariable size={16} />
                              </Button>
                            </span>
                          }
                        />
                      )}
                      <LengthTracker length={buttonState.combinedLength} maxValue={2000} atStart />
                    </div>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              {buttonState.hasVariableInUrl && (
                <Field className="flex-1">
                  <FieldLabel>
                    <p className="text-sm font-medium">{translations("Example")}</p>
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      placeholder={translations("Enter example for {{1}}")}
                      {...form.getFieldProps(`buttons.${index}.example`)}
                    />
                    <InputGroupAddon align="inline-end">
                      <LengthTracker length={buttonState.combinedLength} maxValue={2000} atStart />
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              )}
            </>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              paddingBottom: "8px",
            }}
          >
            <Button variant="ghost" size="icon-sm" onClick={() => deleteButton(index)}>
              <IconX />
            </Button>
          </div>
        </div>
      );
    case WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER:
      return (
        <>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input value={"Call phone number"} readOnly />
          </Field>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput {...form.getFieldProps(`buttons.${index}.text`)} />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.values?.buttons?.[index]?.text?.length}
                  maxValue={25}
                  atStart
                />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <div>
            <p>{translations("Phone Number")}</p>
            <PhoneInputWithCountrySelect
              defaultCountry="IN"
              international
              countryCallingCodeEditable={false}
              placeholder={translations("Enter phone number")}
              value={form?.values?.phone || null}
              {...form.getInputProps(`buttons.${index}.phone_number`)}
              className={
                form?.errors?.[`buttons.${index}.phone_number`]
                  ? styles.inputError
                  : styles.inputPhone
              }
            />
            <p className="text-xs text-destructive">
              {form?.errors?.[`buttons.${index}.phone_number`]}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteButton(index)}>
            <IconX />
          </Button>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.OTP:
      return (
        <>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input defaultValue={"otp"} readOnly />
          </Field>
          <Field>
            <FieldLabel>translations("Button text")</FieldLabel>
            <Input placeholder="Copy code" {...form.getFieldProps(`buttons.${index}.text`)} />
          </Field>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteButton(index)}>
            <IconX />
          </Button>
        </>
      );

    case WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE:
      return (
        <>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input value={"Copy offer code"} readOnly />
          </Field>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput value={"Copy offer code"} disabled />
              <InputGroupAddon align="inline-end">
                <div></div>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field className="flex-1">
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Offer code")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                placeholder={translations("Enter sample code")}
                {...form.getFieldProps(`buttons.${index}.example`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.values?.buttons?.[index]?.example?.length}
                  maxValue={15}
                  atStart
                />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Button variant="ghost" size="icon-sm" onClick={() => deleteButton(index)}>
            <IconX />
          </Button>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.FLOW:
      return (
        <>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input value={"Open a Flow"} readOnly />
          </Field>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput {...form.getFieldProps(`buttons.${index}.text`)} />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.values?.buttons?.[index]?.text?.length}
                  maxValue={25}
                  atStart
                />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <FlowSelector
            onlyPublished
            id={"flowId"}
            {...form.getInputProps(`buttons.${index}.flow_id`)}
            searchable
            label={<p className="text-sm font-medium">{translations("Flow")}</p>}
          />
          <Button variant="ghost" size="icon-sm" onClick={() => deleteButton(index)}>
            <IconX />
          </Button>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.ORDER_DETAILS:
      return (
        <div className="flex flex-col">
          <div className="flex items-center">
            <Field>
              <FieldLabel>
                <p className="text-sm font-medium">{translations("Type of action")}</p>
              </FieldLabel>
              <Input value={"Open order details"} readOnly />
            </Field>
            <Field>
              <FieldLabel>
                <p className="text-sm font-medium">{translations("Button text")}</p>
              </FieldLabel>
              <InputGroup>
                <InputGroupInput disabled {...form.getFieldProps(`buttons.${index}.text`)} />
                <InputGroupAddon align="inline-end">
                  <LengthTracker
                    length={form.values?.buttons?.[index]?.text?.length}
                    maxValue={25}
                    atStart
                  />
                </InputGroupAddon>
              </InputGroup>
            </Field>
            {form.values.category === "MARKETING" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  deleteButton(index);
                }}
              >
                <IconX />
              </Button>
            )}
          </div>
          {form.values.category === "MARKETING" && <OrderDetailsButtonForm form={form} />}
        </div>
      );
    case WHATSAPP_BUTTON_TYPE.CATALOG:
      return (
        <>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input value={"View catalog"} readOnly />
          </Field>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <Input readOnly {...form.getFieldProps(`buttons.${index}.text`)} />
          </Field>
          <div className="flex flex-col p-0">
            <AccountSelector
              label={"Select catalog linked account"}
              {...form.getInputProps(`defaultValues.whatsappSettingsPhoneId`)}
            />
            {!catalog && (
              <p className="text-destructive">No catalogs are linked to selected account</p>
            )}
          </div>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{"Thumbnail product retailer id"}</p>
            </FieldLabel>
            <Select
              items={toSelectOptions(productRetailerIds)}
              value={form.values["defaultValues"]["catalog"]["thumbnail_product_retailer_id"] ?? ""}
              onValueChange={(value) =>
                form.setFieldValue("defaultValues.catalog.thumbnail_product_retailer_id", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toSelectOptions(productRetailerIds).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              form.setFieldValue("defaultValues.catalog.thumbnail_product_retailer_id", "");
              deleteButton(index);
            }}
          >
            <IconX />
          </Button>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.MPM:
      return (
        <div className="flex flex-col">
          <div className="flex items-center">
            <Field>
              <FieldLabel>
                <p className="text-sm font-medium">{translations("Type of action")}</p>
              </FieldLabel>
              <Input value={"View Catalog items"} readOnly />
            </Field>
            <Field>
              <FieldLabel>
                <p className="text-sm font-medium">{translations("Button text")}</p>
              </FieldLabel>
              <Input readOnly {...form.getFieldProps(`buttons.${index}.text`)} />
            </Field>
            <div className="flex flex-col">
              <AccountSelector
                label={"Select catalog linked account"}
                {...form.getInputProps(`defaultValues.whatsappSettingsPhoneId`)}
              />
              {!catalog && (
                <p className="text-destructive">No catalogs are linked to selected account</p>
              )}
            </div>

            <Field>
              <FieldLabel>
                <p className="text-sm font-medium">{"Thumbnail product retailer id"}</p>
              </FieldLabel>
              <Select
                items={toSelectOptions(productRetailerIds)}
                value={
                  form.values["defaultValues"]["catalog"]["thumbnail_product_retailer_id"] ?? ""
                }
                onValueChange={(value) =>
                  form.setFieldValue("defaultValues.catalog.thumbnail_product_retailer_id", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toSelectOptions(productRetailerIds).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button
              variant="ghost"
              size="icon-sm"
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
            </Button>
          </div>
          <Button variant="outline" className="w-fit" onClick={handleAddMPMSections}>
            <IconPlus size={15} />
            Add Sections
            <IconChevronDown size={15} />
          </Button>
          {form.values.defaultValues?.catalog?.mpm?.sections?.map((_sec, index) => (
            <div className="flex items-center p-4" key={index} style={{ borderRadius: "10px" }}>
              <Field>
                <FieldLabel>
                  <p className="text-sm font-medium">Section Title</p>
                </FieldLabel>
                <Input
                  key={form.key(`defaultValues.catalog.mpm.sections.${index}.title`)}
                  {...form.getFieldProps(`defaultValues.catalog.mpm.sections.${index}.title`)}
                />
              </Field>
              <Field>
                <FieldLabel>
                  <p className="text-sm font-medium">{"Product Retailer Ids"}</p>
                </FieldLabel>
                <MultiSelect
                  options={toSelectOptions(productRetailerIds)}
                  value={
                    form.values["defaultValues"]["catalog"]["mpm"]["sections"][`${index}`][
                      "products"
                    ] ?? []
                  }
                  onValueChange={(value) =>
                    form.setFieldValue(
                      `defaultValues.catalog.mpm.sections.${index}.products`,
                      value,
                    )
                  }
                />
              </Field>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => form.removeListItem("defaultValues.catalog.mpm.sections", index)}
              >
                <IconTrash color="red" size={15} />
              </Button>
            </div>
          ))}
        </div>
      );
    case WHATSAPP_BUTTON_TYPE.SPM:
      return (
        <>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input value={"View Single Product"} readOnly />
          </Field>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <Input readOnly {...form.getFieldProps(`buttons.${index}.text`)} />
          </Field>
          <div className="flex flex-col">
            <AccountSelector
              label={"Select catalog linked account"}
              {...form.getInputProps(`defaultValues.whatsappSettingsPhoneId`)}
            />
            {!catalog && (
              <p className="text-destructive">No catalogs are linked to selected account</p>
            )}
          </div>
          <Field>
            <FieldLabel>
              <p className="text-sm font-medium">{"Product retailer id"}</p>
            </FieldLabel>
            <Select
              items={toSelectOptions(productRetailerIds)}
              value={form.values["defaultValues"]["catalog"]["spm"]["product_retailer_id"] ?? ""}
              onValueChange={(value) =>
                form.setFieldValue("defaultValues.catalog.spm.product_retailer_id", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toSelectOptions(productRetailerIds).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              form.setFieldValue("defaultValues.catalog.spm.product_retailer_id", "");
              deleteButton(index);
            }}
          >
            <IconX />
          </Button>
        </>
      );
    default:
      return <></>;
  }
};

const OrderDetailsButtonForm = ({
  form,
}: {
  form: BridgedForm<z.infer<typeof templateSchema>>;
}) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Field>
          <FieldLabel>"Product Type"</FieldLabel>
          <Select
            items={toSelectOptions(["physical-goods", "digital-goods"])}
            value={form.values["defaultValues"]["orderDetails"]["productType"] ?? ""}
            onValueChange={(value) =>
              form.setFieldValue("defaultValues.orderDetails.productType", value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {toSelectOptions(["physical-goods", "digital-goods"]).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>"Product Name"</FieldLabel>
          <Input {...form.getFieldProps("defaultValues.orderDetails.item.name")} />
        </Field>
        <Field>
          <FieldLabel>"Product Price"</FieldLabel>
          <Input
            type="number"
            min={0}
            value={form.values["defaultValues"]["orderDetails"]["item"]["price"] ?? ""}
            onChange={(event) =>
              form.setFieldValue(
                "defaultValues.orderDetails.item.price",
                Number(event.target.value),
              )
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Product Sale Price"</FieldLabel>
          <Input
            type="number"
            min={0}
            value={form.values["defaultValues"]["orderDetails"]["item"]["salePrice"] ?? ""}
            onChange={(event) =>
              form.setFieldValue(
                "defaultValues.orderDetails.item.salePrice",
                Number(event.target.value),
              )
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Quantity"</FieldLabel>
          <Input
            type="number"
            min={0}
            step={1}
            value={form.values["defaultValues"]["orderDetails"]["item"]["quantity"] ?? ""}
            onChange={(event) =>
              form.setFieldValue(
                "defaultValues.orderDetails.item.quantity",
                Number(event.target.value),
              )
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Country of origin"</FieldLabel>
          <Input {...form.getFieldProps("defaultValues.orderDetails.item.origin")} />
        </Field>
      </div>
      <Separator />
      <div className="flex items-center">
        <Field>
          <FieldLabel>"Importer Name"</FieldLabel>
          <Input {...form.getFieldProps("defaultValues.orderDetails.item.importerName")} />
        </Field>
        <Field>
          <FieldLabel>"Importer Address"</FieldLabel>
          <Input {...form.getFieldProps("defaultValues.orderDetails.item.importerAddress1")} />
        </Field>
        <Field>
          <FieldLabel>"City"</FieldLabel>
          <Input {...form.getFieldProps("defaultValues.orderDetails.item.importerCity")} />
        </Field>
        <Field>
          <FieldLabel>"Postal Code"</FieldLabel>
          <Input {...form.getFieldProps("defaultValues.orderDetails.item.importerPostalCode")} />
        </Field>
        <Field>
          <FieldLabel>"Zone Code"</FieldLabel>
          <Input {...form.getFieldProps("defaultValues.orderDetails.item.importerZoneCode")} />
        </Field>
      </div>
      <Separator />
      <div className="flex items-center">
        <Field>
          <FieldLabel>"Shipping Amount"</FieldLabel>
          <Input
            type="number"
            min={0}
            value={form.values["defaultValues"]["orderDetails"]["shipping"] ?? ""}
            onChange={(event) =>
              form.setFieldValue("defaultValues.orderDetails.shipping", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Tax amount"</FieldLabel>
          <Input
            type="number"
            min={0}
            value={form.values["defaultValues"]["orderDetails"]["tax"] ?? ""}
            onChange={(event) =>
              form.setFieldValue("defaultValues.orderDetails.tax", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Tax Description"</FieldLabel>
          <Input {...form.getFieldProps("defaultValues.orderDetails.taxDescription")} />
        </Field>
        <Field>
          <FieldLabel>"Discount Amount"</FieldLabel>
          <Input
            type="number"
            min={0}
            step={1}
            value={form.values["defaultValues"]["orderDetails"]["discount"] ?? ""}
            onChange={(event) =>
              form.setFieldValue("defaultValues.orderDetails.discount", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Discount Description"</FieldLabel>
          <Input {...form.getFieldProps("defaultValues.orderDetails.discountDescription")} />
        </Field>
        <Field>
          <FieldLabel>"Expiry Date"</FieldLabel>
          <Input
            type="datetime-local"
            {...form.getFieldProps("defaultValues.orderDetails.expiry")}
          />
        </Field>
      </div>
      <Separator />
      <div className="flex items-center">
        <Field>
          <FieldLabel>"Payment gateway name"</FieldLabel>
          <Select
            items={toSelectOptions(["razorpay", "payu", "zaakpay"])}
            value={form.values["defaultValues"]["orderDetails"]["paymentType"] ?? ""}
            onValueChange={(value) =>
              form.setFieldValue("defaultValues.orderDetails.paymentType", value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {toSelectOptions(["razorpay", "payu", "zaakpay"]).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            "Name of payment gateway you have configured on your WhatsApp Business Account"
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>"Payment gateway configuration name"</FieldLabel>
          <Input {...form.getFieldProps("defaultValues.orderDetails.paymentConfigName")} />
          <FieldDescription>
            "Configuration name of payment gateway you have configured on your WhatsApp Business
            Account"
          </FieldDescription>
        </Field>
      </div>
    </div>
  );
};
export default ButtonInput;
