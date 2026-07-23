import { IconChevronDown, IconPlus, IconTrash, IconVariable, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useWaFlowsFromDb } from "@/backend/whatsapp/flow/flow.query";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { cn } from "@/lib/utils";
import { WHATSAPP_BUTTON_TYPE } from "@/utils/constants.ts";
import { toSelectOptions } from "@/utils/select-options.ts";

import { LengthTracker } from "../../../input/LengthTracker.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../../ui/field.tsx";
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
import { PhoneNumberField } from "./PhoneNumberField.tsx";
import {
  errorAt,
  inputProps,
  registerField,
  removeItem,
  setValue,
  type TemplateForm,
} from "./template-form.ts";
import { useButtonState } from "./useButtonState.ts";

/** Shared sizing for the fields inside a button row: grow to fill the row, but never
 *  squeeze below a readable width — the row wraps instead. */
const FIELD = "min-w-56 flex-1";

const ButtonInput = ({ form, index, deleteButton, data, catalog, productRetailerIds }) => {
  const { t: translations } = useTranslation();
  const { data: flows } = useWaFlowsFromDb(data.type === WHATSAPP_BUTTON_TYPE.FLOW);
  const buttonState = useButtonState({
    url: form.watch()?.buttons?.[index]?.url,
    example: form.watch()?.buttons?.[index]?.example,
  });
  if (data.type === WHATSAPP_BUTTON_TYPE.FLOW) {
    const screeenId = flows?.find((data) => data.flowId === form?.values?.buttons?.[index]?.flow_id)
      ?.json?.screens?.[0]?.id;
    if (screeenId) {
      data["navigate_screen"] = screeenId;
    }
  }

  function handleAddMPMSections() {
    const defaultValues = form.watch().defaultValues ?? {};
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
    setValue(form, "defaultValues", {
      ...defaultValues,
      catalog: { ...catalog, mpm },
    });
  }
  /** Error for one of this button's fields, e.g. err("text") -> errors["buttons.0.text"]. */
  const err = (field: string) => errorAt(form, `buttons.${index}.${field}`);

  let type = data.type;
  if (data?.url?.includes("COPY_CODE")) {
    type = WHATSAPP_BUTTON_TYPE.OTP;
  }

  switch (type) {
    case WHATSAPP_BUTTON_TYPE.QUICK_REPLY:
      return (
        <>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                aria-invalid={!!err("text")}
                {...registerField(form, `buttons.${index}.text`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.watch()?.buttons?.[index]?.text?.length}
                  maxValue={25}
                  atStart
                />
              </InputGroupAddon>
            </InputGroup>
            {err("text") && <FieldError>{err("text")}</FieldError>}
          </Field>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => deleteButton(index)}
          >
            <IconX />
          </Button>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE:
      return (
        <div className="flex w-full flex-wrap items-end gap-3">
          <Field className={FIELD}>
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
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                aria-invalid={!!err("text")}
                {...registerField(form, `buttons.${index}.text`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.watch()?.buttons?.[index]?.text?.length}
                  maxValue={25}
                  atStart
                />
              </InputGroupAddon>
            </InputGroup>
            {err("text") && <FieldError>{err("text")}</FieldError>}
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
              <Field className={FIELD} data-invalid={!!err("url")}>
                <FieldLabel>
                  <p className="text-sm font-medium">{translations("Website Url")}</p>
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    aria-invalid={!!err("url")}
                    type="url"
                    {...registerField(form, `buttons.${index}.url`)}
                  />
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
                                className="shrink-0"
                                onClick={() => {
                                  const currentUrl = form.watch()?.buttons?.[index]?.url || "";
                                  setValue(form, `buttons.${index}.url`, currentUrl + "{{1}}");
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
                {err("url") && <FieldError>{err("url")}</FieldError>}
              </Field>
              {buttonState.hasVariableInUrl && (
                <Field className={FIELD} data-invalid={!!err("example")}>
                  <FieldLabel>
                    <p className="text-sm font-medium">{translations("Example")}</p>
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      aria-invalid={!!err("example")}
                      placeholder={translations("Enter example for {{1}}")}
                      {...registerField(form, `buttons.${index}.example`)}
                    />
                    <InputGroupAddon align="inline-end">
                      <LengthTracker length={buttonState.combinedLength} maxValue={2000} atStart />
                    </InputGroupAddon>
                  </InputGroup>
                  {err("example") && <FieldError>{err("example")}</FieldError>}
                </Field>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => deleteButton(index)}
          >
            <IconX />
          </Button>
        </div>
      );
    case WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER:
      return (
        <>
          <Field className={FIELD}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input value={"Call phone number"} readOnly />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                aria-invalid={!!err("text")}
                {...registerField(form, `buttons.${index}.text`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.watch()?.buttons?.[index]?.text?.length}
                  maxValue={25}
                  atStart
                />
              </InputGroupAddon>
            </InputGroup>
            {err("text") && <FieldError>{err("text")}</FieldError>}
          </Field>
          <PhoneNumberField form={form} path={`buttons.${index}.phone_number`} />
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => deleteButton(index)}
          >
            <IconX />
          </Button>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.OTP:
      return (
        <>
          <Field className={FIELD}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input defaultValue={"otp"} readOnly />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel>translations("Button text")</FieldLabel>
            <Input
              aria-invalid={!!err("text")}
              placeholder="Copy code"
              {...registerField(form, `buttons.${index}.text`)}
            />
            {err("text") && <FieldError>{err("text")}</FieldError>}
          </Field>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => deleteButton(index)}
          >
            <IconX />
          </Button>
        </>
      );

    case WHATSAPP_BUTTON_TYPE.COPY_OFFER_CODE:
      return (
        <>
          <Field className={FIELD}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input value={"Copy offer code"} readOnly />
          </Field>
          <Field className={FIELD}>
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
          <Field className={FIELD} data-invalid={!!err("example")}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Offer code")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                aria-invalid={!!err("example")}
                placeholder={translations("Enter sample code")}
                {...registerField(form, `buttons.${index}.example`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.watch()?.buttons?.[index]?.example?.length}
                  maxValue={15}
                  atStart
                />
              </InputGroupAddon>
            </InputGroup>
            {err("example") && <FieldError>{err("example")}</FieldError>}
          </Field>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => deleteButton(index)}
          >
            <IconX />
          </Button>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.FLOW:
      return (
        <>
          <Field className={FIELD}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input value={"Open a Flow"} readOnly />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                aria-invalid={!!err("text")}
                {...registerField(form, `buttons.${index}.text`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.watch()?.buttons?.[index]?.text?.length}
                  maxValue={25}
                  atStart
                />
              </InputGroupAddon>
            </InputGroup>
            {err("text") && <FieldError>{err("text")}</FieldError>}
          </Field>
          <FlowSelector
            onlyPublished
            id={"flowId"}
            {...inputProps(form, `buttons.${index}.flow_id`)}
            searchable
            label={<p className="text-sm font-medium">{translations("Flow")}</p>}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => deleteButton(index)}
          >
            <IconX />
          </Button>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.ORDER_DETAILS:
      return (
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field className={FIELD}>
              <FieldLabel>
                <p className="text-sm font-medium">{translations("Type of action")}</p>
              </FieldLabel>
              <Input value={"Open order details"} readOnly />
            </Field>
            <Field className={FIELD} data-invalid={!!err("text")}>
              <FieldLabel>
                <p className="text-sm font-medium">{translations("Button text")}</p>
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  aria-invalid={!!err("text")}
                  disabled
                  {...registerField(form, `buttons.${index}.text`)}
                />
                <InputGroupAddon align="inline-end">
                  <LengthTracker
                    length={form.watch()?.buttons?.[index]?.text?.length}
                    maxValue={25}
                    atStart
                  />
                </InputGroupAddon>
              </InputGroup>
              {err("text") && <FieldError>{err("text")}</FieldError>}
            </Field>
            {form.watch().category === "MARKETING" && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={() => {
                  deleteButton(index);
                }}
              >
                <IconX />
              </Button>
            )}
          </div>
          {form.watch().category === "MARKETING" && <OrderDetailsButtonForm form={form} />}
        </div>
      );
    case WHATSAPP_BUTTON_TYPE.CATALOG:
      return (
        <>
          <Field className={FIELD}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input value={"View catalog"} readOnly />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <Input
              aria-invalid={!!err("text")}
              readOnly
              {...registerField(form, `buttons.${index}.text`)}
            />
            {err("text") && <FieldError>{err("text")}</FieldError>}
          </Field>
          <div className={cn(FIELD, "flex flex-col gap-1")}>
            <AccountSelector
              label={"Select catalog linked account"}
              {...inputProps(form, `defaultValues.whatsappSettingsPhoneId`)}
            />
            {!catalog && (
              <p className="text-destructive">No catalogs are linked to selected account</p>
            )}
          </div>
          <Field className={FIELD}>
            <FieldLabel>
              <p className="text-sm font-medium">{"Thumbnail product retailer id"}</p>
            </FieldLabel>
            <Select
              items={toSelectOptions(productRetailerIds)}
              value={
                form.watch()["defaultValues"]["catalog"]["thumbnail_product_retailer_id"] ?? ""
              }
              onValueChange={(value) =>
                setValue(form, "defaultValues.catalog.thumbnail_product_retailer_id", value)
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
            className="shrink-0"
            onClick={() => {
              setValue(form, "defaultValues.catalog.thumbnail_product_retailer_id", "");
              deleteButton(index);
            }}
          >
            <IconX />
          </Button>
        </>
      );
    case WHATSAPP_BUTTON_TYPE.MPM:
      return (
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field className={FIELD}>
              <FieldLabel>
                <p className="text-sm font-medium">{translations("Type of action")}</p>
              </FieldLabel>
              <Input value={"View Catalog items"} readOnly />
            </Field>
            <Field className={FIELD} data-invalid={!!err("text")}>
              <FieldLabel>
                <p className="text-sm font-medium">{translations("Button text")}</p>
              </FieldLabel>
              <Input
                aria-invalid={!!err("text")}
                readOnly
                {...registerField(form, `buttons.${index}.text`)}
              />
              {err("text") && <FieldError>{err("text")}</FieldError>}
            </Field>
            <div className={cn(FIELD, "flex flex-col gap-1")}>
              <AccountSelector
                label={"Select catalog linked account"}
                {...inputProps(form, `defaultValues.whatsappSettingsPhoneId`)}
              />
              {!catalog && (
                <p className="text-destructive">No catalogs are linked to selected account</p>
              )}
            </div>

            <Field className={FIELD}>
              <FieldLabel>
                <p className="text-sm font-medium">{"Thumbnail product retailer id"}</p>
              </FieldLabel>
              <Select
                items={toSelectOptions(productRetailerIds)}
                value={
                  form.watch()["defaultValues"]["catalog"]["thumbnail_product_retailer_id"] ?? ""
                }
                onValueChange={(value) =>
                  setValue(form, "defaultValues.catalog.thumbnail_product_retailer_id", value)
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
              className="shrink-0"
              onClick={() => {
                setValue(form, "defaultValues.catalog", {
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
          {form.watch().defaultValues?.catalog?.mpm?.sections?.map((_sec, index) => (
            <div
              className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-3"
              key={index}
            >
              <Field className={FIELD}>
                <FieldLabel>
                  <p className="text-sm font-medium">Section Title</p>
                </FieldLabel>
                <Input
                  key={`defaultValues.catalog.mpm.sections.${index}.title`}
                  {...registerField(form, `defaultValues.catalog.mpm.sections.${index}.title`)}
                />
              </Field>
              <Field className={FIELD}>
                <FieldLabel>
                  <p className="text-sm font-medium">{"Product Retailer Ids"}</p>
                </FieldLabel>
                <MultiSelect
                  options={toSelectOptions(productRetailerIds)}
                  value={
                    form.watch()["defaultValues"]["catalog"]["mpm"]["sections"][`${index}`][
                      "products"
                    ] ?? []
                  }
                  onValueChange={(value) =>
                    setValue(form, `defaultValues.catalog.mpm.sections.${index}.products`, value)
                  }
                />
              </Field>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={() => removeItem(form, "defaultValues.catalog.mpm.sections", index)}
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
          <Field className={FIELD}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Type of action")}</p>
            </FieldLabel>
            <Input value={"View Single Product"} readOnly />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel>
              <p className="text-sm font-medium">{translations("Button text")}</p>
            </FieldLabel>
            <Input
              aria-invalid={!!err("text")}
              readOnly
              {...registerField(form, `buttons.${index}.text`)}
            />
            {err("text") && <FieldError>{err("text")}</FieldError>}
          </Field>
          <div className={cn(FIELD, "flex flex-col gap-1")}>
            <AccountSelector
              label={"Select catalog linked account"}
              {...inputProps(form, `defaultValues.whatsappSettingsPhoneId`)}
            />
            {!catalog && (
              <p className="text-destructive">No catalogs are linked to selected account</p>
            )}
          </div>
          <Field className={FIELD}>
            <FieldLabel>
              <p className="text-sm font-medium">{"Product retailer id"}</p>
            </FieldLabel>
            <Select
              items={toSelectOptions(productRetailerIds)}
              value={form.watch()["defaultValues"]["catalog"]["spm"]["product_retailer_id"] ?? ""}
              onValueChange={(value) =>
                setValue(form, "defaultValues.catalog.spm.product_retailer_id", value)
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
            className="shrink-0"
            onClick={() => {
              setValue(form, "defaultValues.catalog.spm.product_retailer_id", "");
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

const OrderDetailsButtonForm = ({ form }: { form: TemplateForm }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel>"Product Type"</FieldLabel>
          <Select
            items={toSelectOptions(["physical-goods", "digital-goods"])}
            value={form.watch()["defaultValues"]["orderDetails"]["productType"] ?? ""}
            onValueChange={(value) =>
              setValue(form, "defaultValues.orderDetails.productType", value)
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
          <Input {...registerField(form, "defaultValues.orderDetails.item.name")} />
        </Field>
        <Field>
          <FieldLabel>"Product Price"</FieldLabel>
          <Input
            type="number"
            min={0}
            value={form.watch()["defaultValues"]["orderDetails"]["item"]["price"] ?? ""}
            onChange={(event) =>
              setValue(form, "defaultValues.orderDetails.item.price", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Product Sale Price"</FieldLabel>
          <Input
            type="number"
            min={0}
            value={form.watch()["defaultValues"]["orderDetails"]["item"]["salePrice"] ?? ""}
            onChange={(event) =>
              setValue(
                form,
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
            value={form.watch()["defaultValues"]["orderDetails"]["item"]["quantity"] ?? ""}
            onChange={(event) =>
              setValue(form, "defaultValues.orderDetails.item.quantity", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Country of origin"</FieldLabel>
          <Input {...registerField(form, "defaultValues.orderDetails.item.origin")} />
        </Field>
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel>"Importer Name"</FieldLabel>
          <Input {...registerField(form, "defaultValues.orderDetails.item.importerName")} />
        </Field>
        <Field>
          <FieldLabel>"Importer Address"</FieldLabel>
          <Input {...registerField(form, "defaultValues.orderDetails.item.importerAddress1")} />
        </Field>
        <Field>
          <FieldLabel>"City"</FieldLabel>
          <Input {...registerField(form, "defaultValues.orderDetails.item.importerCity")} />
        </Field>
        <Field>
          <FieldLabel>"Postal Code"</FieldLabel>
          <Input {...registerField(form, "defaultValues.orderDetails.item.importerPostalCode")} />
        </Field>
        <Field>
          <FieldLabel>"Zone Code"</FieldLabel>
          <Input {...registerField(form, "defaultValues.orderDetails.item.importerZoneCode")} />
        </Field>
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel>"Shipping Amount"</FieldLabel>
          <Input
            type="number"
            min={0}
            value={form.watch()["defaultValues"]["orderDetails"]["shipping"] ?? ""}
            onChange={(event) =>
              setValue(form, "defaultValues.orderDetails.shipping", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Tax amount"</FieldLabel>
          <Input
            type="number"
            min={0}
            value={form.watch()["defaultValues"]["orderDetails"]["tax"] ?? ""}
            onChange={(event) =>
              setValue(form, "defaultValues.orderDetails.tax", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Tax Description"</FieldLabel>
          <Input {...registerField(form, "defaultValues.orderDetails.taxDescription")} />
        </Field>
        <Field>
          <FieldLabel>"Discount Amount"</FieldLabel>
          <Input
            type="number"
            min={0}
            step={1}
            value={form.watch()["defaultValues"]["orderDetails"]["discount"] ?? ""}
            onChange={(event) =>
              setValue(form, "defaultValues.orderDetails.discount", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel>"Discount Description"</FieldLabel>
          <Input {...registerField(form, "defaultValues.orderDetails.discountDescription")} />
        </Field>
        <Field>
          <FieldLabel>"Expiry Date"</FieldLabel>
          <Input
            type="datetime-local"
            {...registerField(form, "defaultValues.orderDetails.expiry")}
          />
        </Field>
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel>"Payment gateway name"</FieldLabel>
          <Select
            items={toSelectOptions(["razorpay", "payu", "zaakpay"])}
            value={form.watch()["defaultValues"]["orderDetails"]["paymentType"] ?? ""}
            onValueChange={(value) =>
              setValue(form, "defaultValues.orderDetails.paymentType", value)
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
          <Input {...registerField(form, "defaultValues.orderDetails.paymentConfigName")} />
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
