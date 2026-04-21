"use client";

import React, { useMemo, useRef, useState } from "react";

import {
  ActionIcon,
  Card,
  CardSection,
  Group,
  Image,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
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
import { useExtracted } from "next-intl";
import { toast } from "sonner";
import { z } from "zod/v4";

import { parseStringWithVariables } from "@/app/dashboard/whatsapp/templates/[templateId]/page";
import { RateupButtonSecondary } from "@/components/Button/RateupButtons";
import { AccountSelector } from "@/components/input/AccountSelector";
import {
  ContainedFileInput,
  ContainedSelection,
  ContainedTextField,
} from "@/components/input/ContainedInput/ContainedInput";
import { LengthTracker } from "@/components/input/LengthTracker";
import PhoneInputWithCountry from "@/components/input/PhoneInputWithCountry";
import {
  WHATSAPP_BUTTON_TYPE,
  WHATSAPP_TEMPLATE_BROADCAST_TYPE,
} from "@/utils/constants";

import { WebsurveySelector } from "../../flows/WebsurveySelector/WebsurveySelector";
import { QuickReplyButton } from "../../MessageComponents";
import { templateSchema } from "../Schema/templateSchema";
import { TextFormateToolBar } from "./TextFormateToolBar";

const CardCarousel = ({
  form,
  catalog,
  productRetailerIds,
}: {
  form: UseFormReturnType<z.infer<typeof templateSchema>>;
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
  const translations = useExtracted();
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
      ((newObject.type = "URL"), (newObject["example"] = []));
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
    <Stack pt={"sm"}>
      <Menu position="top">
        <MenuTarget>
          <RateupButtonSecondary
            w={"fit-content"}
            radius={"md"}
            rightIcon={<IconChevronDown size={15} />}
            title="Add Carousel"
            fw={600}
            leftIcon={<IconPlus size={15} />}
          />
        </MenuTarget>
        <MenuDropdown>
          <Tooltip
            label={
              form.values.productCarousel?.length
                ? "Remove prodcut card to add media card"
                : ""
            }
            disabled={!form.values.productCarousel?.length}
          >
            <MenuItem
              leftSection={<IconCarouselHorizontal size={16} />}
              onClick={handleMediaCarousel}
              disabled={form.values.productCarousel?.length > 0}
            >
              Media Card
            </MenuItem>
          </Tooltip>
          <Tooltip
            disabled={!form.values.mediaCarousel?.length}
            label={
              form.values.mediaCarousel.length > 0
                ? "Remove media card to add product card"
                : ""
            }
          >
            <MenuItem
              leftSection={<IconShoppingCart size={16} />}
              onClick={handleProductCarousel}
              disabled={form.values.mediaCarousel?.length > 0}
            >
              Catalog Product Card
            </MenuItem>
          </Tooltip>
        </MenuDropdown>
      </Menu>
      {form.values.mediaCarousel.length ? (
        <Card bg={"var(--light-grey-color-2)"} p={"sm"} radius={"md"}>
          <Group fz={14} gap={"xs"} wrap="nowrap" mb={"xs"}>
            <IconBulb size={16} />
            Use the same structure for all cards
          </Group>
          {form.values.mediaCarousel.map((card, index) => (
            <Card withBorder mb={"sm"} radius={"md"} key={index}>
              <CardSection withBorder p={4}>
                <Group justify="space-between">
                  <Text>Card {index + 1}</Text>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => deleteMediaCard(index)}
                  >
                    <IconTrash size={16} color="red" />
                  </ActionIcon>
                </Group>
              </CardSection>
              <Stack>
                <Stack pos={"relative"} gap={0}>
                  <Text fz={14} fw={500}>
                    Body{" "}
                    <sup>
                      {" "}
                      <IconAsterisk color="red" size={5} />
                    </sup>
                  </Text>
                  <Text fz={13}>
                    {translations(
                      "Make your messages personal using variables and get more replies!",
                    )}
                  </Text>
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
                    styles={{
                      input: {
                        borderRadius: "0px 0px 12px 12px",
                        paddingRight: 90,
                      },
                      section: {
                        width: "fit-content",
                      },
                    }}
                    placeholder={translations("Enter the text")}
                    autosize
                    minRows={3}
                    onSelect={handleSelect}
                    {...form.getInputProps(`mediaCarousel.${index}.body`)}
                    rightSection={
                      <LengthTracker
                        length={form?.values?.mediaCarousel[index].body?.length}
                        maxValue={1024}
                        atStart
                      />
                    }
                  />
                </Stack>
                {parseStringWithVariables(card.body).map((data, _index) => (
                  <ContainedTextField
                    key={data}
                    placeholder={`${translations("Enter the content for")} {{${data}}}`}
                    {...form.getInputProps(
                      `mediaCarousel.${index}.example.${_index}`,
                    )}
                  />
                ))}
                <Group>
                  <ContainedSelection
                    data={[
                      WHATSAPP_TEMPLATE_BROADCAST_TYPE.IMAGE,
                      WHATSAPP_TEMPLATE_BROADCAST_TYPE.VIDEO,
                    ]}
                    {...form.getInputProps(`mediaCarousel.${index}.format`)}
                    label={"Header Format"}
                  />
                  <ContainedFileInput
                    {...form.getInputProps(`mediaCarousel.${index}.header`)}
                    label={
                      card?.header
                        ? `Update ${card.format.toLowerCase()}`
                        : `Choose ${card.format.toLowerCase()}`
                    }
                    w={250}
                    placeholder={"Select"}
                  />
                </Group>
                <CarouselButtonMenu
                  btnLength={card.buttons.length}
                  handleButtonSelect={(btn) => handleButtonSelect(btn, index)}
                />
                {card.buttons.map((btn, btnIndex) => (
                  <Group
                    bg={"var(--light-grey-color-4)"}
                    p={"xs"}
                    key={`${btn.type}_${btnIndex}`}
                    style={{ borderRadius: "5px" }}
                  >
                    <ContainedTextField
                      value={getButtonAction(
                        btn.example ? WHATSAPP_BUTTON_TYPE.WEBSURVEY : btn.type,
                      )}
                      readOnly
                      label={"Button Type"}
                    />
                    <ContainedTextField
                      label={"Button Text"}
                      {...form.getInputProps(
                        `mediaCarousel.${index}.buttons.${btnIndex}.text`,
                      )}
                    />
                    {btn.type === WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER ? (
                      <PhoneInputWithCountry
                        label={"Phone Number"}
                        {...form.getInputProps(
                          `mediaCarousel.${index}.buttons.${btnIndex}.phone_number`,
                        )}
                      />
                    ) : btn.type === WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE &&
                      btn.example ? (
                      <WebsurveySelector
                        onlyPublished
                        searchable
                        label={
                          <Text fz={14} fw={500}>
                            {translations("Web Survey")}
                          </Text>
                        }
                        comboboxProps={{ position: "top" }}
                        form={form}
                        index={btnIndex}
                        carousel={`mediaCarousel.${index}.buttons.${btnIndex}`}
                      />
                    ) : btn.type === WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE ? (
                      <ContainedTextField
                        label={"Url"}
                        {...form.getInputProps(
                          `mediaCarousel.${index}.buttons.${btnIndex}.url`,
                        )}
                      />
                    ) : null}
                    <ActionIcon
                      variant="subtle"
                      mt={24}
                      onClick={() =>
                        form.removeListItem(
                          `mediaCarousel.${index}.buttons`,
                          btnIndex,
                        )
                      }
                    >
                      <IconX size={17} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            </Card>
          ))}
        </Card>
      ) : null}
      {form.values.productCarousel.length ? (
        <Card bg={"var(--light-grey-color-2)"} p={"sm"} radius={"md"}>
          <AccountSelector
            label={"Select catalog linked account"}
            {...form.getInputProps(`defaultValues.whatsappSettingsPhoneId`)}
          />
          {form.values.defaultValues.whatsappSettingsPhoneId.length &&
            !catalog && (
              <Text size="xs" c="red">
                No catalogs are linked to selected account
              </Text>
            )}
          <Group fz={14} gap={"xs"} wrap="nowrap" mb={"xs"} mt={"lg"}>
            <IconBulb size={16} />
            Use the same structure for all cards
          </Group>
          {form.values.productCarousel.map((card, index) => (
            <Card withBorder mb={"sm"} radius={"md"} key={index}>
              <CardSection withBorder p={4}>
                <Group justify="space-between">
                  <Text>Card {index + 1}</Text>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => deleteProductCard(index)}
                  >
                    <IconTrash size={16} color="red" />
                  </ActionIcon>
                </Group>
              </CardSection>
              <Group p={"xs"}>
                <ContainedSelection
                  data={productCarouselButtons}
                  {...form.getInputProps(
                    `productCarousel.${index}.button.type`,
                  )}
                  label={
                    <Text fz={14} fw={500}>
                      {translations("Type of action")}
                    </Text>
                  }
                  placeholder="Select a action"
                  onChange={(value, option) => {
                    const spmBtn = value === WHATSAPP_BUTTON_TYPE.SPM;
                    form.setFieldValue(`productCarousel.${index}.button`, {
                      type:
                        value === WHATSAPP_BUTTON_TYPE.WEBSURVEY
                          ? "URL"
                          : value,
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
                />
                <ContainedTextField
                  {...form.getInputProps(
                    `productCarousel.${index}.button.text`,
                  )}
                  readOnly={card.button.type === WHATSAPP_BUTTON_TYPE.SPM}
                  label={
                    <Text fz={14} fw={500}>
                      {translations("Button text")}
                    </Text>
                  }
                />
                {!card.button.example && (
                  <ContainedTextField
                    {...form.getInputProps(
                      `productCarousel.${index}.button.url`,
                    )}
                    display={
                      card.button.type === WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE
                        ? "block"
                        : "none"
                    }
                    label={
                      <Text fz={14} fw={500}>
                        {translations("Website Url")}
                      </Text>
                    }
                  />
                )}

                {card.button.example && (
                  <WebsurveySelector
                    onlyPublished
                    searchable
                    label={
                      <Text fz={14} fw={500}>
                        {translations("Web Survey")}
                      </Text>
                    }
                    comboboxProps={{ position: "top" }}
                    form={form}
                    index={0}
                    carousel={`productCarousel.${index}.button`}
                  />
                )}
                <ContainedSelection
                  data={productRetailerIds}
                  {...form.getInputProps(
                    `productCarousel.${index}.product_retailer_id`,
                  )}
                  label={
                    <Text fz={14} fw={500}>
                      Product Item
                    </Text>
                  }
                  placeholder="Select a product"
                />
              </Group>
            </Card>
          ))}
        </Card>
      ) : null}
    </Stack>
  );
};

const CarouselButtonMenu = ({ btnLength, handleButtonSelect }) => {
  return (
    <Menu position="top">
      <MenuTarget>
        <RateupButtonSecondary
          w={"fit-content"}
          radius={"md"}
          rightIcon={<IconChevronDown size={15} />}
          title="Add Button"
          fw={600}
          leftIcon={<IconPlus size={15} />}
        />
      </MenuTarget>
      <MenuDropdown>
        <Tooltip
          label={btnLength === 2 ? "Maximum 2 buttons allowed" : ""}
          disabled={btnLength < 2}
        >
          <Menu.Item
            disabled={btnLength === 2}
            leftSection={<IconAdjustments size={16} />}
            onClick={() => handleButtonSelect(WHATSAPP_BUTTON_TYPE.QUICK_REPLY)}
          >
            Quick Reply Button
          </Menu.Item>
        </Tooltip>
        <Tooltip
          label={btnLength === 2 ? "Maximum 2 buttons allowed" : ""}
          disabled={btnLength < 2}
        >
          <Menu.Item
            disabled={btnLength === 2}
            leftSection={<IconLink size={16} />}
            onClick={() =>
              handleButtonSelect(WHATSAPP_BUTTON_TYPE.VISIT_WEBSITE)
            }
          >
            Visit website
          </Menu.Item>
        </Tooltip>
        <Tooltip
          label={btnLength === 2 ? "Maximum 2 buttons allowed" : ""}
          disabled={btnLength < 2}
        >
          <Menu.Item
            disabled={btnLength === 2}
            leftSection={<IconWorld size={16} />}
            onClick={() => handleButtonSelect(WHATSAPP_BUTTON_TYPE.WEBSURVEY)}
          >
            Rateup Web Survey
          </Menu.Item>
        </Tooltip>
        <Tooltip
          label={btnLength === 2 ? "Maximum 2 buttons allowed" : ""}
          disabled={btnLength < 2}
        >
          <Menu.Item
            disabled={btnLength === 2}
            leftSection={<IconPhone size={16} />}
            onClick={() =>
              handleButtonSelect(WHATSAPP_BUTTON_TYPE.CALL_PHONE_NUMBER)
            }
          >
            Call phone number
          </Menu.Item>
        </Tooltip>
      </MenuDropdown>
    </Menu>
  );
};

export const ProductCardCarouselPreview = ({
  form,
  catalog,
}: {
  form: UseFormReturnType<z.infer<typeof templateSchema>>;
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
        <Stack
          gap={0}
          style={{ borderRadius: "10px" }}
          key={index}
          p={1}
          bg={"white"}
          w={"180px"}
        >
          <Image
            src={card.image || null}
            h={100}
            w={"100%"}
            alt="image of the product"
          />
          <Stack gap={1} bg={"var(--light-grey-color)"} p={"xs"}>
            <Text fw={600} truncate>
              {card.title}
            </Text>
            <Text c="dimmed" size="sm">
              {card.price}
            </Text>
          </Stack>
          <QuickReplyButton text={card.button.text} type={card.button.type} />
        </Stack>
      ))}
    </>
  );
};

export default CardCarousel;
