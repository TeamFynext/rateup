import {
  IconAdjustments,
  IconAsterisk,
  IconBulb,
  IconCarouselHorizontal,
  IconChevronDown,
  IconLink,
  IconPhone,
  IconPlus,
  IconShoppingCart,
  IconTrash,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import { useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { WHATSAPP_BUTTON_TYPE, WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "@/utils/constants.ts";
import { parseStringWithVariables } from "@/utils/whatsapp/templates.tsx";

import { WebsurveySelector } from "../../flows/WebsurveySelector/WebsurveySelector.tsx";
import { QuickReplyButton } from "../../MessageComponents.tsx";
import { PhoneNumberField } from "./PhoneNumberField.tsx";
import {
  appendItem,
  errorAt,
  inputProps,
  registerField,
  removeItem,
  setValue,
  type TemplateForm,
} from "./template-form.ts";
import { TextFormateToolBar } from "./TextFormateToolBar.tsx";

const CardCarousel = ({
  form,
  catalog,
  productRetailerIds,
}: {
  form: TemplateForm;
  catalog: any;
  productRetailerIds: string[];
}) => {
  const uid = useId();
  function handleMediaCarousel() {
    if (form.watch().mediaCarousel.length === 10) {
      toast.error("Only 10 cards are allowed");
      return;
    }
    const firstCard = form.watch().mediaCarousel[0];
    appendItem(form, "mediaCarousel", {
      body: "",
      format: "IMAGE",
      header: null,
      example: [],
      buttons: firstCard ? firstCard.buttons : [],
    });
  }

  function handleProductCarousel() {
    if (form.watch().productCarousel.length === 10) {
      toast.error("Only 10 cards are allowed");
      return;
    }
    const firstCard = form.watch().productCarousel[0];
    appendItem(form, "productCarousel", {
      button: firstCard
        ? firstCard.button
        : {
            type: WHATSAPP_BUTTON_TYPE.SPM,
            text: "View",
          },
      product_retailer_id: "",
    });
  }
  const { t: translations } = useTranslation();
  const [selectedText, setSelectedText] = useState("");
  const contentHistory = useRef([]); // Ref to store content history
  const inputRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  const applyFormatting = (style, index) => {
    const content = form.watch().mediaCarousel[index].body;

    if (style.startsWith("{{")) {
      const newContent = content + style;
      setValue(form, `mediaCarousel.${index}.body`, newContent);
      return;
    }
    if (!selectedText) return;
    const formattedText = `${style}${selectedText}${style}`;
    if (!contentHistory.current[index]) {
      contentHistory.current[index] = [];
    }
    contentHistory.current[index].push(content);
    const newContent = content.replace(selectedText, formattedText);
    setValue(form, `mediaCarousel.${index}.body`, newContent);
  };

  const undo = (index) => {
    if (contentHistory.current[index].length > 0) {
      const previousContent = contentHistory.current[index].pop();
      setValue(form, `mediaCarousel.${index}.body`, previousContent);
    }
  };

  const insertValue = (value: string, index) => {
    const input = inputRefs.current[index];
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const newText = text.substring(0, start) + value + text.substring(end);
    setValue(form, `mediaCarousel.${index}.body`, newText);
    const newCursorPosition = start + value.length;
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    input.focus();
  };
  const handleSelect = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    setSelectedText(selectedText?.trim());
  };

  function deleteMediaCard(index) {
    removeItem(form, "mediaCarousel", index);
  }
  function deleteProductCard(index) {
    removeItem(form, "productCarousel", index);
  }
  function handleButtonSelect(btn, index) {
    const newObject = { type: btn, text: "" };
    if (btn === WHATSAPP_BUTTON_TYPE.WEBSURVEY) {
      newObject.type = "URL";
      newObject["example"] = [];
    }
    const existing = form
      .watch()
      .mediaCarousel[index].buttons.find((b) => b.type === newObject.type);
    if (existing) {
      toast.error(`Only one button allowed for this type`);
      return;
    }
    appendItem(form, `mediaCarousel.${index}.buttons`, newObject);
  }

  const headerFormatOptions = [
    {
      value: WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE,
      label: WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE,
    },
    {
      value: WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO,
      label: WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO,
    },
  ];

  const productItemOptions = productRetailerIds.map((id) => ({ value: id, label: id }));

  const productCarouselButtons = [
    {
      value: WHATSAPP_BUTTON_TYPE.SPM,
      label: "View Single Product",
    },
    {
      value: WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE,
      label: "Visit website",
    },
    {
      value: WHATSAPP_BUTTON_TYPE.WEBSURVEY,
      label: "Rateup Web Survey",
    },
  ];

  function getButtonAction(type) {
    switch (type) {
      case WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER:
        return "Call phone number";
      case WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE:
        return "Visit a Website";
      case WHATSAPP_BUTTON_TYPE.WEBSURVEY:
        return "RateUp Web Survey";
      case WHATSAPP_BUTTON_TYPE.QUICK_REPLY:
        return "Quick Reply";
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" className="w-fit font-semibold" />}>
          <IconPlus size={15} />
          Add Carousel
          <IconChevronDown size={15} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <CustomTooltip
            content={
              <span>
                {form.watch().productCarousel?.length
                  ? "Remove prodcut card to add media card"
                  : ""}
              </span>
            }
            trigger={
              <span>
                <DropdownMenuItem
                  onClick={handleMediaCarousel}
                  disabled={form.watch().productCarousel?.length > 0}
                >
                  <IconCarouselHorizontal size={16} />
                  Media Card
                </DropdownMenuItem>
              </span>
            }
          />
          <CustomTooltip
            content={
              <span>
                {form.watch().mediaCarousel.length > 0
                  ? "Remove media card to add product card"
                  : ""}
              </span>
            }
            trigger={
              <span>
                <DropdownMenuItem
                  onClick={handleProductCarousel}
                  disabled={form.watch().mediaCarousel?.length > 0}
                >
                  <IconShoppingCart size={16} />
                  Catalog Product Card
                </DropdownMenuItem>
              </span>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
      {form.watch().mediaCarousel.length ? (
        <Card className="gap-4 rounded-lg bg-muted p-4">
          <div className="flex items-center gap-2.5 text-sm">
            <IconBulb size={16} />
            Use the same structure for all cards
          </div>
          {form.watch().mediaCarousel.map((card, index) => (
            <Card className="gap-0 overflow-hidden rounded-lg border p-0" key={index}>
              <div className="border-b px-3 py-2">
                <div className="flex items-center justify-between">
                  <p>Card {index + 1}</p>
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteMediaCard(index)}>
                    <IconTrash size={16} color="red" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-4 p-3">
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      Body{" "}
                      <sup>
                        {" "}
                        <IconAsterisk color="red" size={5} />
                      </sup>
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {translations(
                        "Make your messages personal using variables and get more replies!",
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <TextFormateToolBar
                      applyFormatting={(style) => applyFormatting(style, index)}
                      insertValue={(value) => insertValue(value, index)}
                      undo={() => undo(index)}
                      dynamicVariables={parseStringWithVariables(card.body)}
                    />
                    <div className="relative">
                      <Textarea
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        className="field-sizing-content rounded-t-none rounded-b-xl pr-22.5"
                        placeholder={translations("Enter the text")}
                        rows={3}
                        onSelect={handleSelect}
                        aria-invalid={!!errorAt(form, `mediaCarousel.${index}.body`)}
                        {...registerField(form, `mediaCarousel.${index}.body`)}
                      />
                      <div className="pointer-events-none absolute right-2 bottom-2">
                        <LengthTracker
                          length={form.watch()?.mediaCarousel[index].body?.length}
                          maxValue={1024}
                          atStart
                        />
                      </div>
                    </div>
                    {errorAt(form, `mediaCarousel.${index}.body`) && (
                      <FieldError>{errorAt(form, `mediaCarousel.${index}.body`)}</FieldError>
                    )}
                  </div>
                </div>
                {parseStringWithVariables(card.body).length > 0 && (
                  <div className="flex flex-col gap-2">
                    {parseStringWithVariables(card.body).map((data, _index) => (
                      <Input
                        key={data}
                        placeholder={`${translations("Enter the content for")} {{${data}}}`}
                        {...registerField(form, `mediaCarousel.${index}.example.${_index}`)}
                      />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`${uid}-header-format-${index}`}>Header Format</FieldLabel>
                    <Select
                      items={headerFormatOptions}
                      value={form.watch().mediaCarousel?.[index]?.format ?? ""}
                      onValueChange={(value) =>
                        setValue(form, `mediaCarousel.${index}.format`, value)
                      }
                    >
                      <SelectTrigger id={`${uid}-header-format-${index}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {headerFormatOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${uid}-choose-${index}`}>
                      {card?.header
                        ? `Update ${card.format.toLowerCase()}`
                        : `Choose ${card.format.toLowerCase()}`}
                    </FieldLabel>
                    <Input
                      id={`${uid}-choose-${index}`}
                      type="file"
                      onChange={(event) =>
                        setValue(
                          form,
                          `mediaCarousel.${index}.header`,
                          event.target.files?.[0] ?? null,
                        )
                      }
                    />
                  </Field>
                </div>
                <CarouselButtonMenu
                  btnLength={card.buttons.length}
                  handleButtonSelect={(btn) => handleButtonSelect(btn, index)}
                />
                {card.buttons.map((btn, btnIndex) => (
                  <div
                    className="flex flex-wrap items-end gap-3 rounded-lg bg-background p-3"
                    key={`${btn.type}_${btnIndex}`}
                  >
                    <Field className="min-w-56 flex-1">
                      <FieldLabel htmlFor={`${uid}-button-type-${index}`}>Button Type</FieldLabel>
                      <Input
                        id={`${uid}-button-type-${index}`}
                        value={getButtonAction(
                          btn.example ? WHATSAPP_BUTTON_TYPE.WEBSURVEY : btn.type,
                        )}
                        readOnly
                      />
                    </Field>
                    <Field className="min-w-56 flex-1">
                      <FieldLabel htmlFor={`${uid}-button-text-${index}`}>Button Text</FieldLabel>
                      <Input
                        id={`${uid}-button-text-${index}`}
                        {...registerField(form, `mediaCarousel.${index}.buttons.${btnIndex}.text`)}
                      />
                    </Field>
                    {btn.type === WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER ? (
                      <PhoneNumberField
                        form={form}
                        path={`mediaCarousel.${index}.buttons.${btnIndex}.phone_number`}
                      />
                    ) : btn.type === WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE && btn.example ? (
                      <WebsurveySelector
                        onlyPublished
                        searchable
                        label={<p className="text-sm font-medium">{translations("Web Survey")}</p>}
                        form={form}
                        index={btnIndex}
                        carousel={`mediaCarousel.${index}.buttons.${btnIndex}`}
                      />
                    ) : btn.type === WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE ? (
                      <Field className="min-w-56 flex-1">
                        <FieldLabel htmlFor={`${uid}-url-${index}`}>Url</FieldLabel>
                        <Input
                          id={`${uid}-url-${index}`}
                          {...registerField(form, `mediaCarousel.${index}.buttons.${btnIndex}.url`)}
                        />
                      </Field>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => removeItem(form, `mediaCarousel.${index}.buttons`, btnIndex)}
                    >
                      <IconX size={17} />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </Card>
      ) : null}
      {form.watch().productCarousel.length ? (
        <Card className="gap-4 rounded-lg bg-muted p-4">
          <AccountSelector
            label={"Select catalog linked account"}
            {...inputProps(form, `defaultValues.whatsappSettingsPhoneId`)}
          />
          {form.watch().defaultValues.whatsappSettingsPhoneId.length && !catalog && (
            <p className="text-xs text-destructive">No catalogs are linked to selected account</p>
          )}
          <div className="flex items-center gap-2.5 text-sm">
            <IconBulb size={16} />
            Use the same structure for all cards
          </div>
          {form.watch().productCarousel.map((card, index) => (
            <Card className="gap-0 overflow-hidden rounded-lg border p-0" key={index}>
              <div className="border-b px-3 py-2">
                <div className="flex items-center justify-between">
                  <p>Card {index + 1}</p>
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteProductCard(index)}>
                    <IconTrash size={16} color="red" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor={`${uid}-field-${index}`}>
                    <p className="text-sm font-medium">{translations("Type of action")}</p>
                  </FieldLabel>
                  <Select
                    items={productCarouselButtons}
                    value={form.watch().productCarousel?.[index]?.button?.type ?? ""}
                    onValueChange={(value) => {
                      const spmBtn = value === WHATSAPP_BUTTON_TYPE.SPM;
                      setValue(form, `productCarousel.${index}.button`, {
                        type: value === WHATSAPP_BUTTON_TYPE.WEBSURVEY ? "URL" : value,
                        text: spmBtn ? "View" : "",
                        ...(!spmBtn
                          ? {
                              url: "",
                              ...(value === WHATSAPP_BUTTON_TYPE.WEBSURVEY
                                ? {
                                    example: [],
                                  }
                                : {}),
                            }
                          : {}),
                      });
                    }}
                  >
                    <SelectTrigger id={`${uid}-field-${index}`} className="w-full">
                      <SelectValue placeholder="Select a action" />
                    </SelectTrigger>
                    <SelectContent>
                      {productCarouselButtons.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${uid}-field-2-${index}`}>
                    <p className="text-sm font-medium">{translations("Button text")}</p>
                  </FieldLabel>
                  <Input
                    id={`${uid}-field-2-${index}`}
                    {...registerField(form, `productCarousel.${index}.button.text`)}
                    readOnly={card.button.type === WHATSAPP_BUTTON_TYPE.SPM}
                  />
                </Field>
                {!card.button.example && (
                  <Field
                    className={
                      card.button.type === WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE ? "" : "hidden"
                    }
                  >
                    <FieldLabel htmlFor={`${uid}-field-3-${index}`}>
                      <p className="text-sm font-medium">{translations("Website Url")}</p>
                    </FieldLabel>
                    <Input
                      id={`${uid}-field-3-${index}`}
                      {...registerField(form, `productCarousel.${index}.button.url`)}
                    />
                  </Field>
                )}

                {card.button.example && (
                  <WebsurveySelector
                    onlyPublished
                    searchable
                    label={<p className="text-sm font-medium">{translations("Web Survey")}</p>}
                    form={form}
                    index={0}
                    carousel={`productCarousel.${index}.button`}
                  />
                )}
                <Field>
                  <FieldLabel htmlFor={`${uid}-product-item-${index}`}>
                    <p className="text-sm font-medium">Product Item</p>
                  </FieldLabel>
                  <Select
                    items={productItemOptions}
                    value={form.watch().productCarousel?.[index]?.product_retailer_id ?? ""}
                    onValueChange={(value) =>
                      setValue(form, `productCarousel.${index}.product_retailer_id`, value)
                    }
                  >
                    <SelectTrigger id={`${uid}-product-item-${index}`} className="w-full">
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {productItemOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Card>
          ))}
        </Card>
      ) : null}
    </div>
  );
};

const CarouselButtonMenu = ({ btnLength, handleButtonSelect }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="w-fit font-semibold" />}>
        <IconPlus size={15} />
        Add Button
        <IconChevronDown size={15} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <CustomTooltip
          content={<span>{btnLength === 2 ? "Maximum 2 buttons allowed" : ""}</span>}
          trigger={
            <span>
              <DropdownMenuItem
                disabled={btnLength === 2}
                onClick={() => handleButtonSelect(WHATSAPP_BUTTON_TYPE.QUICK_REPLY)}
              >
                <IconAdjustments size={16} />
                Quick Reply Button
              </DropdownMenuItem>
            </span>
          }
        />
        <CustomTooltip
          content={<span>{btnLength === 2 ? "Maximum 2 buttons allowed" : ""}</span>}
          trigger={
            <span>
              <DropdownMenuItem
                disabled={btnLength === 2}
                onClick={() => handleButtonSelect(WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE)}
              >
                <IconLink size={16} />
                Visit website
              </DropdownMenuItem>
            </span>
          }
        />
        <CustomTooltip
          content={<span>{btnLength === 2 ? "Maximum 2 buttons allowed" : ""}</span>}
          trigger={
            <span>
              <DropdownMenuItem
                disabled={btnLength === 2}
                onClick={() => handleButtonSelect(WHATSAPP_BUTTON_TYPE.WEBSURVEY)}
              >
                <IconWorld size={16} />
                Rateup Web Survey
              </DropdownMenuItem>
            </span>
          }
        />
        <CustomTooltip
          content={<span>{btnLength === 2 ? "Maximum 2 buttons allowed" : ""}</span>}
          trigger={
            <span>
              <DropdownMenuItem
                disabled={btnLength === 2}
                onClick={() => handleButtonSelect(WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER)}
              >
                <IconPhone size={16} />
                Call phone number
              </DropdownMenuItem>
            </span>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const ProductCardCarouselPreview = ({
  form,
  catalog,
}: {
  form: TemplateForm;
  catalog: any;
}) => {
  const productCardData = useMemo(
    () =>
      catalog
        ? form.watch().productCarousel?.map((card) => {
            const product = catalog?.products?.find(
              (p) => p?.retailer_id === card.product_retailer_id,
            );
            return {
              image: product?.image_link || product?.image?.[0]?.url || "",
              title: product?.title ?? product?.name ?? "",
              price: product?.price || "",
              button: card.button,
            };
          })
        : [],
    [catalog, form.watch().productCarousel],
  );
  if (!productCardData?.length) return;
  return (
    <>
      {productCardData.map((card, index) => (
        <div className="flex w-45 flex-col gap-0 overflow-hidden rounded-xl bg-white" key={index}>
          <img
            src={card.image || undefined}
            className="h-25 w-full object-cover"
            alt="image of the product"
          />
          <div className="flex flex-col gap-px bg-(--light-grey-color) p-2.5">
            <p className="truncate font-semibold">{card.title}</p>
            <p className="text-sm text-muted-foreground">{card.price}</p>
          </div>
          <QuickReplyButton text={card.button.text} type={card.button.type} />
        </div>
      ))}
    </>
  );
};

export default CardCarousel;
