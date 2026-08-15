import { IconChevronDown, IconPlus, IconTrash, IconVariable, IconX } from "@tabler/icons-react";
import { useId } from "react";
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
  type TemplateFormValues,
} from "./template-form.ts";
import { useButtonState } from "./useButtonState.ts";

/** Shared sizing for the fields inside a button row: grow to fill the row, but never
 *  squeeze below a readable width — the row wraps instead. */
const FIELD = "min-w-56 flex-1";

const ButtonInput = ({
  form,
  index,
  deleteButton,
  data,
  catalog,
  productRetailerIds,
}: {
  form: TemplateForm;
  index: number;
  deleteButton: (index: number) => void;
  data: Record<string, unknown>;
  catalog?: unknown;
  productRetailerIds?: string[];
}) => {
  const { t: translations } = useTranslation();
  const uid = useId();
  /** Stable, unique DOM id for one of this button's fields, e.g. fid("text"). */
  const fid = (field: string) => `${uid}-${field}`;
  const selectedWhatsappPhoneId =
    form.watch()?.whatsappSettingsPhoneId ||
    form.watch()?.defaultValues?.whatsappSettingsPhoneId ||
    undefined;
  const { data: flows } = useWaFlowsFromDb(
    data.type === WHATSAPP_BUTTON_TYPE.FLOW,
    selectedWhatsappPhoneId,
  );
  const buttonState = useButtonState({
    url: form.watch()?.buttons?.[index]?.url,
    example: form.watch()?.buttons?.[index]?.example,
  });
  if (data.type === WHATSAPP_BUTTON_TYPE.FLOW) {
    // NOTE: reads the Mantine-era `form.values`, which a react-hook-form
    // instance does not expose — so this is `undefined` today. Preserved as-is;
    // see the migration notes.
    const legacyValues = (form as unknown as { values?: TemplateFormValues }).values;
    const screeenId = flows?.find(
      (flow: { flowId?: string; json?: { screens?: Array<{ id?: string }> } }) =>
        flow.flowId === legacyValues?.buttons?.[index]?.flow_id,
    )?.json?.screens?.[0]?.id;
    if (screeenId) {
      data["navigate_screen"] = screeenId;
    }
  }

  function handleAddMPMSections() {
    const defaultValues = form.watch().defaultValues ?? {};
    // The seed omits `catalogId`; it is filled in once a catalog is picked.
    const catalog = (defaultValues?.catalog ?? {
      thumbnail_product_retailer_id: "",
    }) as NonNullable<NonNullable<TemplateFormValues["defaultValues"]>["catalog"]>;
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
  if (String(data?.url ?? "").includes("COPY_CODE")) {
    type = WHATSAPP_BUTTON_TYPE.OTP;
  }

  switch (type) {
    case WHATSAPP_BUTTON_TYPE.QUICK_REPLY:
      return (
        <>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel htmlFor={fid("text")}>{translations("Button text")}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={fid("text")}
                aria-invalid={!!err("text")}
                {...registerField(form, `buttons.${index}.text`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.watch()?.buttons?.[index]?.text?.length ?? 0}
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
            <FieldLabel htmlFor={fid("type")}>{translations("Type of action")}</FieldLabel>
            <Input
              id={fid("type")}
              value={
                buttonState.isWebSurvey
                  ? translations("RateUp Web Survey")
                  : translations("Visit a Website")
              }
              readOnly
            />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel htmlFor={fid("text")}>{translations("Button text")}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={fid("text")}
                aria-invalid={!!err("text")}
                {...registerField(form, `buttons.${index}.text`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.watch()?.buttons?.[index]?.text?.length ?? 0}
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
                <FieldLabel htmlFor={fid("url")}>{translations("Website Url")}</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id={fid("url")}
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
                  <FieldLabel htmlFor={fid("example")}>{translations("Example")}</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={fid("example")}
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
            <FieldLabel htmlFor={fid("type")}>{translations("Type of action")}</FieldLabel>
            <Input id={fid("type")} value={"Call phone number"} readOnly />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel htmlFor={fid("text")}>{translations("Button text")}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={fid("text")}
                aria-invalid={!!err("text")}
                {...registerField(form, `buttons.${index}.text`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.watch()?.buttons?.[index]?.text?.length ?? 0}
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
            <FieldLabel htmlFor={fid("type")}>{translations("Type of action")}</FieldLabel>
            <Input id={fid("type")} defaultValue={"otp"} readOnly />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel htmlFor={fid("text")}>{translations("Button text")}</FieldLabel>
            <Input
              id={fid("text")}
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
            <FieldLabel htmlFor={fid("type")}>{translations("Type of action")}</FieldLabel>
            <Input id={fid("type")} value={"Copy offer code"} readOnly />
          </Field>
          <Field className={FIELD}>
            <FieldLabel htmlFor={fid("text")}>{translations("Button text")}</FieldLabel>
            <InputGroup>
              <InputGroupInput id={fid("text")} value={"Copy offer code"} disabled />
              <InputGroupAddon align="inline-end">
                <div></div>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field className={FIELD} data-invalid={!!err("example")}>
            <FieldLabel htmlFor={fid("example")}>{translations("Offer code")}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={fid("example")}
                aria-invalid={!!err("example")}
                placeholder={translations("Enter sample code")}
                {...registerField(form, `buttons.${index}.example`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.watch()?.buttons?.[index]?.example?.length ?? 0}
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
            <FieldLabel htmlFor={fid("type")}>{translations("Type of action")}</FieldLabel>
            <Input id={fid("type")} value={"Open a Flow"} readOnly />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel htmlFor={fid("text")}>{translations("Button text")}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={fid("text")}
                aria-invalid={!!err("text")}
                {...registerField(form, `buttons.${index}.text`)}
              />
              <InputGroupAddon align="inline-end">
                <LengthTracker
                  length={form.watch()?.buttons?.[index]?.text?.length ?? 0}
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
            // The template is created on this number's WABA, and a FLOW button can only
            // point at a flow from that same WABA.
            whatsappSettingsPhoneId={selectedWhatsappPhoneId}
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
              <FieldLabel htmlFor={fid("type")}>{translations("Type of action")}</FieldLabel>
              <Input id={fid("type")} value={"Open order details"} readOnly />
            </Field>
            <Field className={FIELD} data-invalid={!!err("text")}>
              <FieldLabel htmlFor={fid("text")}>{translations("Button text")}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id={fid("text")}
                  aria-invalid={!!err("text")}
                  disabled
                  {...registerField(form, `buttons.${index}.text`)}
                />
                <InputGroupAddon align="inline-end">
                  <LengthTracker
                    length={form.watch()?.buttons?.[index]?.text?.length ?? 0}
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
            <FieldLabel htmlFor={fid("type")}>{translations("Type of action")}</FieldLabel>
            <Input id={fid("type")} value={"View catalog"} readOnly />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel htmlFor={fid("text")}>{translations("Button text")}</FieldLabel>
            <Input
              id={fid("text")}
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
            <FieldLabel htmlFor={fid("thumb")}>Thumbnail product retailer id</FieldLabel>
            <Select
              items={toSelectOptions(productRetailerIds)}
              value={
                form.watch()["defaultValues"]?.["catalog"]?.["thumbnail_product_retailer_id"] ?? ""
              }
              onValueChange={(value) =>
                setValue(form, "defaultValues.catalog.thumbnail_product_retailer_id", value)
              }
            >
              <SelectTrigger id={fid("thumb")} className="w-full">
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
              <FieldLabel htmlFor={fid("type")}>{translations("Type of action")}</FieldLabel>
              <Input id={fid("type")} value={"View Catalog items"} readOnly />
            </Field>
            <Field className={FIELD} data-invalid={!!err("text")}>
              <FieldLabel htmlFor={fid("text")}>{translations("Button text")}</FieldLabel>
              <Input
                id={fid("text")}
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
              <FieldLabel htmlFor={fid("thumb")}>Thumbnail product retailer id</FieldLabel>
              <Select
                items={toSelectOptions(productRetailerIds)}
                value={
                  form.watch()["defaultValues"]?.["catalog"]?.["thumbnail_product_retailer_id"] ??
                  ""
                }
                onValueChange={(value) =>
                  setValue(form, "defaultValues.catalog.thumbnail_product_retailer_id", value)
                }
              >
                <SelectTrigger id={fid("thumb")} className="w-full">
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
          {form
            .watch()
            .defaultValues?.catalog?.mpm?.sections?.map((_sec: unknown, index: number) => (
              <div
                className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-3"
                key={index}
              >
                <Field className={FIELD}>
                  <FieldLabel htmlFor={fid(`section-${index}-title`)}>Section Title</FieldLabel>
                  <Input
                    id={fid(`section-${index}-title`)}
                    key={`defaultValues.catalog.mpm.sections.${index}.title`}
                    {...registerField(form, `defaultValues.catalog.mpm.sections.${index}.title`)}
                  />
                </Field>
                <Field className={FIELD}>
                  <FieldLabel htmlFor={fid(`section-${index}-products`)}>
                    Product Retailer Ids
                  </FieldLabel>
                  <MultiSelect
                    id={fid(`section-${index}-products`)}
                    options={toSelectOptions(productRetailerIds)}
                    value={
                      form.watch()["defaultValues"]?.["catalog"]?.["mpm"]?.["sections"]?.[
                        `${index}`
                      ]?.["products"] ?? []
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
            <FieldLabel htmlFor={fid("type")}>{translations("Type of action")}</FieldLabel>
            <Input id={fid("type")} value={"View Single Product"} readOnly />
          </Field>
          <Field className={FIELD} data-invalid={!!err("text")}>
            <FieldLabel htmlFor={fid("text")}>{translations("Button text")}</FieldLabel>
            <Input
              id={fid("text")}
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
            <FieldLabel htmlFor={fid("retailer")}>Product retailer id</FieldLabel>
            <Select
              items={toSelectOptions(productRetailerIds)}
              value={
                form.watch()["defaultValues"]?.["catalog"]?.["spm"]?.["product_retailer_id"] ?? ""
              }
              onValueChange={(value) =>
                setValue(form, "defaultValues.catalog.spm.product_retailer_id", value)
              }
            >
              <SelectTrigger id={fid("retailer")} className="w-full">
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
  const uid = useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`${uid}-product-type`}>Product Type</FieldLabel>
          <Select
            items={toSelectOptions(["physical-goods", "digital-goods"])}
            value={form.watch()["defaultValues"]?.["orderDetails"]?.["productType"] ?? ""}
            onValueChange={(value) =>
              setValue(form, "defaultValues.orderDetails.productType", value)
            }
          >
            <SelectTrigger id={`${uid}-product-type`} className="w-full">
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
          <FieldLabel htmlFor={`${uid}-product-name`}>Product Name</FieldLabel>
          <Input
            id={`${uid}-product-name`}
            {...registerField(form, "defaultValues.orderDetails.item.name")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-product-price`}>Product Price</FieldLabel>
          <Input
            id={`${uid}-product-price`}
            type="number"
            min={0}
            value={form.watch()["defaultValues"]?.["orderDetails"]?.["item"]["price"] ?? ""}
            onChange={(event) =>
              setValue(form, "defaultValues.orderDetails.item.price", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-product-sale-price`}>Product Sale Price</FieldLabel>
          <Input
            id={`${uid}-product-sale-price`}
            type="number"
            min={0}
            value={form.watch()["defaultValues"]?.["orderDetails"]?.["item"]["salePrice"] ?? ""}
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
          <FieldLabel htmlFor={`${uid}-quantity`}>Quantity</FieldLabel>
          <Input
            id={`${uid}-quantity`}
            type="number"
            min={0}
            step={1}
            value={form.watch()["defaultValues"]?.["orderDetails"]?.["item"]["quantity"] ?? ""}
            onChange={(event) =>
              setValue(form, "defaultValues.orderDetails.item.quantity", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-country-of-origin`}>Country of origin</FieldLabel>
          <Input
            id={`${uid}-country-of-origin`}
            {...registerField(form, "defaultValues.orderDetails.item.origin")}
          />
        </Field>
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`${uid}-importer-name`}>Importer Name</FieldLabel>
          <Input
            id={`${uid}-importer-name`}
            {...registerField(form, "defaultValues.orderDetails.item.importerName")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-importer-address`}>Importer Address</FieldLabel>
          <Input
            id={`${uid}-importer-address`}
            {...registerField(form, "defaultValues.orderDetails.item.importerAddress1")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-city`}>City</FieldLabel>
          <Input
            id={`${uid}-city`}
            {...registerField(form, "defaultValues.orderDetails.item.importerCity")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-postal-code`}>Postal Code</FieldLabel>
          <Input
            id={`${uid}-postal-code`}
            {...registerField(form, "defaultValues.orderDetails.item.importerPostalCode")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-zone-code`}>Zone Code</FieldLabel>
          <Input
            id={`${uid}-zone-code`}
            {...registerField(form, "defaultValues.orderDetails.item.importerZoneCode")}
          />
        </Field>
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`${uid}-shipping-amount`}>Shipping Amount</FieldLabel>
          <Input
            id={`${uid}-shipping-amount`}
            type="number"
            min={0}
            value={form.watch()["defaultValues"]?.["orderDetails"]?.["shipping"] ?? ""}
            onChange={(event) =>
              setValue(form, "defaultValues.orderDetails.shipping", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-tax-amount`}>Tax amount</FieldLabel>
          <Input
            id={`${uid}-tax-amount`}
            type="number"
            min={0}
            value={form.watch()["defaultValues"]?.["orderDetails"]?.["tax"] ?? ""}
            onChange={(event) =>
              setValue(form, "defaultValues.orderDetails.tax", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-tax-description`}>Tax Description</FieldLabel>
          <Input
            id={`${uid}-tax-description`}
            {...registerField(form, "defaultValues.orderDetails.taxDescription")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-discount-amount`}>Discount Amount</FieldLabel>
          <Input
            id={`${uid}-discount-amount`}
            type="number"
            min={0}
            step={1}
            value={form.watch()["defaultValues"]?.["orderDetails"]?.["discount"] ?? ""}
            onChange={(event) =>
              setValue(form, "defaultValues.orderDetails.discount", Number(event.target.value))
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-discount-description`}>Discount Description</FieldLabel>
          <Input
            id={`${uid}-discount-description`}
            {...registerField(form, "defaultValues.orderDetails.discountDescription")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${uid}-expiry-date`}>Expiry Date</FieldLabel>
          <Input
            id={`${uid}-expiry-date`}
            type="datetime-local"
            {...registerField(form, "defaultValues.orderDetails.expiry")}
          />
        </Field>
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel htmlFor={`${uid}-payment-gateway-name`}>Payment gateway name</FieldLabel>
          <Select
            items={toSelectOptions(["razorpay", "payu", "zaakpay"])}
            value={form.watch()["defaultValues"]?.["orderDetails"]?.["paymentType"] ?? ""}
            onValueChange={(value) =>
              setValue(form, "defaultValues.orderDetails.paymentType", value)
            }
          >
            <SelectTrigger id={`${uid}-payment-gateway-name`} className="w-full">
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
          <FieldLabel htmlFor={`${uid}-payment-gateway-configuration-name`}>
            Payment gateway configuration name
          </FieldLabel>
          <Input
            id={`${uid}-payment-gateway-configuration-name`}
            {...registerField(form, "defaultValues.orderDetails.paymentConfigName")}
          />
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
