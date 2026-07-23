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
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { z } from "zod/v4";

import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { LengthTracker } from "@/components/input/LengthTracker.tsx";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import CustomTooltip from "@/components/ui/custom/CustomTooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import type { BridgedForm } from "@/hooks/useBridgedForm";
import { WHATSAPP_BUTTON_TYPE, WHATSAPP_TEMPLATE_BROADCAST_TYPE } from "@/utils/constants.ts";
import { parseStringWithVariables } from "@/utils/whatsapp/templates.tsx";

import { WebsurveySelector } from "../../flows/WebsurveySelector/WebsurveySelector.tsx";
import { QuickReplyButton } from "../../MessageComponents.tsx";
import type { templateSchema } from "../Schema/templateSchema.ts";
import { TextFormateToolBar } from "./TextFormateToolBar.tsx";

const CardCarousel = ({
  form,
  catalog,
  productRetailerIds,
}: {
  form: BridgedForm<z.infer<typeof templateSchema>>;
  catalog: any;
  productRetailerIds: string[];
}) => {
  function handleMediaCarousel() {
    if (form.values.mediaCarousel.length === 10) {
      toast.error("Only 10 cards are allowed");
      return;
    }
    const firstCard = form.values.mediaCarousel[0];
    form.insertListItem("mediaCarousel", {
      body: "",
      format: "IMAGE",
      header: null,
      example: [],
      buttons: firstCard ? firstCard.buttons : [],
    });
  }

  function handleProductCarousel() {
    if (form.values.productCarousel.length === 10) {
      toast.error("Only 10 cards are allowed");
      return;
    }
    const firstCard = form.values.productCarousel[0];
    form.insertListItem("productCarousel", {
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
    const content = form.values.mediaCarousel[index].body;

    if (style.startsWith("{{")) {
      const newContent = content + style;
      form.setFieldValue(`mediaCarousel.${index}.body`, newContent);
      return;
    }
    if (!selectedText) return;
    const formattedText = `${style}${selectedText}${style}`;
    if (!contentHistory.current[index]) {
      contentHistory.current[index] = [];
    }
    contentHistory.current[index].push(content);
    const newContent = content.replace(selectedText, formattedText);
    form.setFieldValue(`mediaCarousel.${index}.body`, newContent);
  };

  const undo = (index) => {
    if (contentHistory.current[index].length > 0) {
      const previousContent = contentHistory.current[index].pop();
      form.setFieldValue(`mediaCarousel.${index}.body`, previousContent);
    }
  };

  const insertValue = (value: string, index) => {
    const input = inputRefs.current[index];
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const newText = text.substring(0, start) + value + text.substring(end);
    form.setFieldValue(`mediaCarousel.${index}.body`, newText);
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
    form.removeListItem("mediaCarousel", index);
  }
  function deleteProductCard(index) {
    form.removeListItem("productCarousel", index);
  }
  function handleButtonSelect(btn, index) {
    const newObject = { type: btn, text: "" };
    if (btn === WHATSAPP_BUTTON_TYPE.WEBSURVEY) {
      newObject.type = "URL";
      newObject["example"] = [];
    }
    const existing = form.values.mediaCarousel[index].buttons.find(
      (b) => b.type === newObject.type,
    );
    if (existing) {
      toast.error(`Only one button allowed for this type`);
      return;
    }
    form.insertListItem(`mediaCarousel.${index}.buttons`, newObject);
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
    <div className="flex flex-col pt-3">
      <DropdownMenu>
        <DropdownMenuTrigger render={<span />}>
          <Button variant="outline" className="w-fit font-semibold">
            <IconPlus size={15} />
            Add Carousel
            <IconChevronDown size={15} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <CustomTooltip
            content={
              <span>
                {form.values.productCarousel?.length ? "Remove prodcut card to add media card" : ""}
              </span>
            }
            trigger={
              <span>
                <DropdownMenuItem
                  onClick={handleMediaCarousel}
                  disabled={form.values.productCarousel?.length > 0}
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
                {form.values.mediaCarousel.length > 0
                  ? "Remove media card to add product card"
                  : ""}
              </span>
            }
            trigger={
              <span>
                <DropdownMenuItem
                  onClick={handleProductCarousel}
                  disabled={form.values.mediaCarousel?.length > 0}
                >
                  <IconShoppingCart size={16} />
                  Catalog Product Card
                </DropdownMenuItem>
              </span>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
      {form.values.mediaCarousel.length ? (
        <Card className="gap-2 rounded-md bg-(--light-grey-color-2) p-3">
          <div className="flex items-center text-sm gap-2.5 flex-nowrap mb-2.5">
            <IconBulb size={16} />
            Use the same structure for all cards
          </div>
          {form.values.mediaCarousel.map((card, index) => (
            <Card className="mb-3 gap-0 rounded-md border" key={index}>
              <div className="border-b p-1">
                <div className="flex items-center justify-between">
                  <p>Card {index + 1}</p>
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteMediaCard(index)}>
                    <IconTrash size={16} color="red" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="relative flex flex-col gap-0">
                  <p className="text-sm font-medium">
                    Body{" "}
                    <sup>
                      {" "}
                      <IconAsterisk color="red" size={5} />
                    </sup>
                  </p>
                  <p className="text-[13px]">
                    {translations(
                      "Make your messages personal using variables and get more replies!",
                    )}
                  </p>
                  <TextFormateToolBar
                    applyFormatting={(style) => applyFormatting(style, index)}
                    insertValue={(value) => insertValue(value, index)}
                    undo={() => undo(index)}
                    dynamicVariables={parseStringWithVariables(card.body)}
                  />
                  <Textarea
                    // ref={(el) => (inputRefs.current[index] = el)}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    className="field-sizing-content rounded-t-none rounded-b-xl pr-[90px]"
                    placeholder={translations("Enter the text")}
                    rows={3}
                    onSelect={handleSelect}
                    {...form.getInputProps(`mediaCarousel.${index}.body`)}
                  />
                  <div className="pointer-events-none absolute right-2 bottom-2">
                    <LengthTracker
                      length={form?.values?.mediaCarousel[index].body?.length}
                      maxValue={1024}
                      atStart
                    />
                  </div>
                </div>
                {parseStringWithVariables(card.body).map((data, _index) => (
                  <Input
                    key={data}
                    placeholder={`${translations("Enter the content for")} {{${data}}}`}
                    {...form.getFieldProps(`mediaCarousel.${index}.example.${_index}`)}
                  />
                ))}
                <div className="flex items-center">
                  <Field>
                    <FieldLabel>Header Format</FieldLabel>
                    <Select
                      items={headerFormatOptions}
                      value={form.values.mediaCarousel?.[index]?.format ?? ""}
                      onValueChange={(value) =>
                        form.setFieldValue(`mediaCarousel.${index}.format`, value)
                      }
                    >
                      <SelectTrigger className="w-full">
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
                  <Field className="w-62.5">
                    <FieldLabel>
                      {card?.header
                        ? `Update ${card.format.toLowerCase()}`
                        : `Choose ${card.format.toLowerCase()}`}
                    </FieldLabel>
                    <Input
                      type="file"
                      onChange={(event) =>
                        form.setFieldValue(
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
                    className="flex items-center bg-(--light-grey-color-4) p-2.5"
                    key={`${btn.type}_${btnIndex}`}
                    style={{ borderRadius: "5px" }}
                  >
                    <Field>
                      <FieldLabel>Button Type</FieldLabel>
                      <Input
                        value={getButtonAction(
                          btn.example ? WHATSAPP_BUTTON_TYPE.WEBSURVEY : btn.type,
                        )}
                        readOnly
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Button Text</FieldLabel>
                      <Input
                        {...form.getFieldProps(`mediaCarousel.${index}.buttons.${btnIndex}.text`)}
                      />
                    </Field>
                    {btn.type === WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER ? (
                      <PhoneInputWithCountry
                        label={"Phone Number"}
                        {...form.getInputProps(
                          `mediaCarousel.${index}.buttons.${btnIndex}.phone_number`,
                        )}
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
                      <Field>
                        <FieldLabel>Url</FieldLabel>
                        <Input
                          {...form.getFieldProps(`mediaCarousel.${index}.buttons.${btnIndex}.url`)}
                        />
                      </Field>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="mt-6"
                      onClick={() =>
                        form.removeListItem(`mediaCarousel.${index}.buttons`, btnIndex)
                      }
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
      {form.values.productCarousel.length ? (
        <Card className="gap-2 rounded-md bg-(--light-grey-color-2) p-3">
          <AccountSelector
            label={"Select catalog linked account"}
            {...form.getInputProps(`defaultValues.whatsappSettingsPhoneId`)}
          />
          {form.values.defaultValues.whatsappSettingsPhoneId.length && !catalog && (
            <p className="text-xs text-destructive">No catalogs are linked to selected account</p>
          )}
          <div className="flex items-center text-sm gap-2.5 flex-nowrap mb-2.5 mt-5">
            <IconBulb size={16} />
            Use the same structure for all cards
          </div>
          {form.values.productCarousel.map((card, index) => (
            <Card className="mb-3 gap-0 rounded-md border" key={index}>
              <div className="border-b p-1">
                <div className="flex items-center justify-between">
                  <p>Card {index + 1}</p>
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteProductCard(index)}>
                    <IconTrash size={16} color="red" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center p-2.5">
                <Field>
                  <FieldLabel>
                    <p className="text-sm font-medium">{translations("Type of action")}</p>
                  </FieldLabel>
                  <Select
                    items={productCarouselButtons}
                    value={form.values.productCarousel?.[index]?.button?.type ?? ""}
                    onValueChange={(value) => {
                      const spmBtn = value === WHATSAPP_BUTTON_TYPE.SPM;
                      form.setFieldValue(`productCarousel.${index}.button`, {
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
                    <SelectTrigger className="w-full">
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
                  <FieldLabel>
                    <p className="text-sm font-medium">{translations("Button text")}</p>
                  </FieldLabel>
                  <Input
                    {...form.getFieldProps(`productCarousel.${index}.button.text`)}
                    readOnly={card.button.type === WHATSAPP_BUTTON_TYPE.SPM}
                  />
                </Field>
                {!card.button.example && (
                  <Field
                    className={
                      card.button.type === WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE ? "" : "hidden"
                    }
                  >
                    <FieldLabel>
                      <p className="text-sm font-medium">{translations("Website Url")}</p>
                    </FieldLabel>
                    <Input {...form.getFieldProps(`productCarousel.${index}.button.url`)} />
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
                  <FieldLabel>
                    <p className="text-sm font-medium">Product Item</p>
                  </FieldLabel>
                  <Select
                    items={productItemOptions}
                    value={form.values.productCarousel?.[index]?.product_retailer_id ?? ""}
                    onValueChange={(value) =>
                      form.setFieldValue(`productCarousel.${index}.product_retailer_id`, value)
                    }
                  >
                    <SelectTrigger className="w-full">
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
      <DropdownMenuTrigger render={<span />}>
        <Button variant="outline" className="w-fit font-semibold">
          <IconPlus size={15} />
          Add Button
          <IconChevronDown size={15} />
        </Button>
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
  form: BridgedForm<z.infer<typeof templateSchema>>;
  catalog: any;
}) => {
  const productCardData = useMemo(
    () =>
      catalog
        ? form.values.productCarousel?.map((card) => {
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
    [catalog, form.values.productCarousel],
  );
  if (!productCardData?.length) return;
  return (
    <>
      {productCardData.map((card, index) => (
        <div
          className="flex w-45 flex-col gap-0 bg-white p-px"
          style={{ borderRadius: "10px" }}
          key={index}
        >
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
